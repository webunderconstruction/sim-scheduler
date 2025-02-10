require("dotenv").config();

const cron = require('node-cron');
const { SerialPort, ReadlineParser } = require("serialport");
const { getDutyOfficer, getDutyOfficerByPhoneNumber, getDutyOfficerPhoneNumberByName } = require("./dutyOfficer");

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

function sendCommand(command, streamIndex = 0, returnCheckString = 'OK') {
  const parser = new ReadlineParser({ delimiter: "\r\n" });
  const dataStream = [];

  return new Promise((resolve, reject) => {
    // if after 60 seconds we don't get any data more than 1 char, we reject
    const timer = setTimeout(() => {
      port.unpipe(parser);
      reject("Timeout");
    }, 60000);

    parser.on("data", (data) => {
      console.log("...waiting for delicious data", data.length, data);
      if (data.length > 1) {
        dataStream.push(data);
      }
      // send if first thing that comes back
      if (data.includes(returnCheckString)) {
        port.unpipe(parser);
        clearTimeout(timer);
        console.log("close port!");
        try {
          port.close();
        } catch (error) {
          console.log("error trying to close port", error);
        }

        resolve(dataStream[streamIndex]);
      }
    });

    //open port
    port.open((error) => {
      if (error) {
        reject(error);
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
  const response = await sendCommand("AT+CPIN?");
  return response.includes("SIM PIN");
}

async function getCurrentRedirectNumber() {
  const response = await sendCommand("AT+CCFC=0,2");
  console.log("getCurrentRedirectNumber", response);
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
      const unlockSIM = await sendCommand(`AT+CPIN=${process.env.SIM_PIN}`, '+CPIN: READY');
      console.log("unlockSIM status", unlockSIM);
    }

    console.log("SIM not locked, continuing...");

    // check if current phone LT DO matches this week's LT DO
    const currentPh = await getCurrentRedirectNumber();
    console.log("current phone LT DO", currentPh);

    if (currentPh !== phoneNumber) {
      console.log('Phone number does not match, setting new number...');
      const setDTOResponse = await sendCommand(
        `AT+CCFC=0,3,"${phoneNumber}"\r`
      );

      sendSMS(process.env.ADMIN_PH, `The redirect LT DO has been updated to ${name}`);
      console.log("Set new number response", setDTOResponse);

      return;
    }

    console.log('Current phone number matches, exiting...');
  } catch (error) {
    console.log("crap!", error);
  }
}

async function checkSMS() {
  const response = await sendCommand('AT+CMGL="REC UNREAD"', 0);
  console.log("checkSMS", response);

  if(response !== 'OK') {
    const smsID = getSMSMessageId(response);
    const smsText = await readSMS(smsID);
    
    if(smsText.trim().toLowerCase() === 'who is') {

      const currentPh = await getCurrentRedirectNumber();
      const currentName = getDutyOfficerByPhoneNumber(currentPh);

      console.log('Sending sms...')

      const { name } = getDutyOfficer(new Date());

      sendSMS(process.env.ADMIN_PH, `The current redirect LT DO is ${currentName}, the roaster should be ${name}`);
      
    }

    if(smsText.includes('change to')) {

      const changeToName = extractNameFromChangeToCommand(smsText);
      if(changeToName) {
        const phoneNumber = getDutyOfficerPhoneNumberByName(changeToName);
        const setDTOResponse = await sendCommand(
          `AT+CCFC=0,3,"${phoneNumber}"\r`
        );
  
        sendSMS(process.env.ADMIN_PH, `The redirect LT DO has been updated to ${changeToName}`);
        console.log("Set new number response", setDTOResponse);
      }

    }
  }
}

async function readSMS(id) {
  const response = await sendCommand(`AT+CMGR=${id}`, 1);
  console.log("readSMS", response);
  return response;
}

async function sendSMS(phoneNumber, message) {
  const commands = [`AT+CMGS="${phoneNumber}"\r`,`${message}\x1A`];
  const response = await sendCommand(commands);

  console.log("sendSMS response", response);
}

cron.schedule('0 19 * * *', () => {
  console.log('Running CRON job main(), every day at 19:00');
  main()
});

cron.schedule('*/5 * * * *', () => {
  console.log('Checking for SMS');
  checkSMS();
});
