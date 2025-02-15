require("dotenv").config();

const cron = require('node-cron');
const { SerialPort, ReadlineParser } = require("serialport");
const { getDutyOfficer, getDutyOfficerByPhoneNumber, getDutyOfficerPhoneNumberByName } = require("./dutyOfficer");
const {stopModem} = require('./stopModem');

const port = new SerialPort(
  {
    path: "/dev/ttyUSB2",
    baudRate: 115200,
    autoOpen: false,
  },
  (err) => {
    console.log("Init");
    if (err) console.log("Error", err, err.message);
  }
);

// function startSerialPort(port) {
//   parser.on("data", (data) => {
//     console.log("data:", data);
//     if (data.includes("+CPIN: READY")) {
//       console.log("SIM card ready");
//       isSimReady = true;
//     }

//     if (data.includes("+CPIN: SIM PIN")) {
//       console.log("SIM card no ready, enter PIN");
//     }
//   });
//   parser.on("error", console.log);

//   port.on("open", (err) => {
//     // check if SIM is ready
//     port.write("AT+CPIN?\r");
//   });
// }



function sendCommand(command) {
  const parser = new ReadlineParser({ delimiter: "\r\n" });
  const data = [];

  return new Promise((resolve, reject) => {
    // if after 60 seconds we don't get any data more than 1 char, we reject
    const timer = setTimeout(() => {
      port.unpipe(parser);
      reject({success: false, data: null, error: 'timeout'});
    }, 60000);

    parser.on("data", (serialData) => {
      console.log("data stream...", serialData);
      if (serialData.length > 1 && serialData !== 'OK') {
        data.push(serialData);
      }
      // send if first thing that comes back
      if (serialData.includes('OK')) {
        port.unpipe(parser);
        clearTimeout(timer);
        console.log("close port!");
        try {
          port.close();
        } catch (error) {
          console.log("error trying to close port", error);
        }

        resolve({success: true, data});
      }

      if(serialData.includes('ERROR')) {
        port.unpipe(parser);
        clearTimeout(timer);
        console.log("close port! AT error response");
        try {
          port.close();
        } catch (error) {
          console.log("error trying to close port", error);
        }

        reject({success: false, data: null});
      }
    });

    //open port
    port.open((error) => {
      if (error) {
        reject({success: false, data: null, error});
      }
      port.pipe(parser);

      if (Array.isArray(command)) {
        command.forEach(cmd => port.write(`${cmd}`));
      } else {
        port.write(`${command}\r`);
      }
    });
  });
}

// check SIM unlocked

// if not, unlock the SIM

// get current LT DO

// if current LT DO != who it should be, set it

// otherwise exit

async function isSimLocked() {
  const {success, data} = await sendCommand("AT+CPIN?");
  console.log('isSimLocked', data);
  
  return success ? data.includes("SIM PIN") : false;
}

async function getCurrentRedirectNumber() {
  const {data} = await sendCommand("AT+CCFC=0,2");
  const [response] = data
  console.log("getCurrentRedirectNumber", data);
  // use regex to find phone number between quotes and return that string, second element of the array
  return response ? response.match(/"(.*?)"/)[1] : '';
}

function getSMSMessageId(response) {
  const match = response.match(/\+CMGL: (\d+),/);
  return match ? match[1] : null;
}

function getSMSPhoneNumber(response) {
  const match = response.match(/\+CMGL: \d+,"REC UNREAD","(\+?\d+)"/);
  return match ? match[1] : null;
}

function extractNameFromChangeToCommand(command) {
  const match = command.match(/change to: (\w+)/);
  return match ? match[1] : null;
}

// main function to check SIM and update LT DO
async function main() {
  const { name, phoneNumber } = getDutyOfficer(new Date());
  console.log("LT DO", name, phoneNumber);

  console.log("sending async command!");

  try {
    // check if SIM is locked
    if (await isSimLocked()) {
      console.log('SIM is locked, sending unlock command...');
      const {data} = await sendCommand(`AT+CPIN=${process.env.SIM_PIN}`);
      console.log("unlockSIM status", data);
    }

    console.log("SIM not locked, continuing...");

    // check if current phone LT DO matches this week's LT DO
    const currentPh = await getCurrentRedirectNumber();
    console.log("current phone LT DO", currentPh);

    if (currentPh !== phoneNumber) {
      console.log('Phone number does not match, setting new number...');
      const {success, data} = await sendCommand(
        `AT+CCFC=0,3,"${phoneNumber}"`
      );
      const [setDTOResponse] = data;
      const smsMessage = success ? `The redirect LT DO has been updated to ${name}`: 'Error setting new redirect'; 
      
      sendSMS(process.env.ADMIN_PH, smsMessage);
      
      console.log("Set new number response", setDTOResponse);

      return;
    }

    console.log('Current phone number matches, exiting...');
  } catch (error) {
    console.log("crap!", error);

    console.log('Try to reset the modem');
    stopModem();


  }
}

async function checkSMS() {
  const {data} = await sendCommand('AT+CMGL="REC UNREAD"');
  // const {data} = await sendCommand('AT+CMGL="ALL"');
  
  // console.log("checkSMS", data);

  const smsList = processSMSList(data);

  // return;

  smsList.map(async (sms) => {
    const {meta, message} = sms;

    console.log('sms:', message)

    if(!message) {
      console.log('sms blank, skipping...');

      return;
    }

    
    if(message.trim().toLowerCase() === 'who is') {

      console.log('Processing who is command...')

      const currentPh = await getCurrentRedirectNumber();
      const currentName = getDutyOfficerByPhoneNumber(currentPh);

      console.log('Sending sms...')

      const { name } = getDutyOfficer(new Date());

      // sendSMS(process.env.ADMIN_PH, `The current redirect LT DO is ${currentName}, the roaster should be ${name}`);
      
    }

    if(message.includes('change to')) {

      console.log('Processing change to command...')

      const changeToName = extractNameFromChangeToCommand(message);
      if(changeToName) {
        const phoneNumber = getDutyOfficerPhoneNumberByName(changeToName);
        const {success, data} = await sendCommand(
          `AT+CCFC=0,3,"${phoneNumber}"`
        );
  
        // sendSMS(process.env.ADMIN_PH, `The redirect LT DO has been updated to ${changeToName}`);
        console.log("Set new number response", data);
      }

    }

  })
  
}

async function readSMS(id) {
  const {data} = await sendCommand(`AT+CMGR=${id}`);
  console.log("readSMS", response);
  return data[0];
}

async function sendSMS(phoneNumber, message) {
  const commands = [`AT+CMGS="${phoneNumber}"\r`,`${message}\x1A`];
  const {data} = await sendCommand(commands);

  console.log("sendSMS response", data);
}

function processSMSList(smsList) {
  const processedSMS = [];
  for (let index = 0; index < smsList.length; index++) {
    const element = smsList[index];

    if(index % 2) {
      processedSMS[index] = {...processedSMS[index], message: element }
    } else {
      processedSMS[index] = {...processedSMS[index], meta: element }
    }
    // index % 2 ? processedSMS[index] : {meta: element} : console.log('second', element)
    
    
  }

  return processedSMS;
}

cron.schedule('0 19 * * *', () => {
  console.log('Running CRON job main(), every day at 19:00');
  main()
});

cron.schedule('*/5 * * * *', () => {
  console.log('Checking for SMS');
  checkSMS();
});

// checkSMS();

// main();
