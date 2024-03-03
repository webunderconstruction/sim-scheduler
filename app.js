require("dotenv").config();

const { SerialPort, ReadlineParser } = require("serialport");
const { getDutyOfficer } = require("./dutyOfficer");

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

function sendCommand(command, returnCheckString = 'OK') {
  const parser = new ReadlineParser();
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

        resolve(dataStream[0]);
      }
    });

    //open port
    port.open((error) => {
      if (error) {
      
        reject(error);
      }
      port.pipe(parser);
      port.write(`${command}\r`);
    });
  });
}

const { name, phoneNumber } = getDutyOfficer(new Date());
console.log("LT DTO", name, phoneNumber);

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
  // use regex to find phone number between quotes and return that string, second element of the array
  return response.match(/"(.*?)"/)[1];
}

//testing
async function test() {
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
      const setDTOResponse = await sendCommand(
        `AT+CCFC=0,3,"${phoneNumber}"\r`
      );
      console.log("setDTOResponse", setDTOResponse);
    }
  } catch (error) {
    console.log("crap!", error);
  }
}

test();

// startSerialPort();
