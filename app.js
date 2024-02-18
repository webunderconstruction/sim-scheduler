require("dotenv").config();

const { SerialPort, ReadlineParser } = require("serialport");
const { getDutyOfficer } = require("./dutyOfficer");

const parser = new ReadlineParser();

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

function startSerialPort(port) {
  parser.on("data", (data) => {
    console.log("data:", data);
    if (data.includes("+CPIN: READY")) {
      console.log("SIM card ready");
      isSimReady = true;
    }

    if (data.includes("+CPIN: SIM PIN")) {
      console.log("SIM card no ready, enter PIN");
    }
  });
  parser.on("error", console.log);

  port.on("open", (err) => {
    // check if SIM is ready
    port.write("AT+CPIN?\r");
  });
}

function sendCommand(command) {
  const dataStream = [];
  return new Promise((resolve, reject) => {
    // if after 60 seconds we don't get any data more than 1 char, we reject
    const timer = setTimeout(() => {
      reject("Timeout");
    }, 60000);

    //open port
    port.open((error) => {
      if (error) {
        reject(error);
      }
      port.pipe(parser);
      port.write(`${command}\r`);
    });

    parser.on("data", (data) => {
      console.log("...waiting for delicious data", data.length, data);
      if (data.length > 1) {
        dataStream.push(data);
      }
      // send if first thing that comes back
      if (data.includes("OK")) {
        port.unpipe(parser);
        clearTimeout(timer);
        console.log("close port!");
        port.close();
        resolve(dataStream[0]);
      }
    });
  });
}

const { name, phoneNumber } = getDutyOfficer(new Date());
console.log("LT DTO", name, phoneNumber);

//testing
async function test() {
  console.log("sending async command!");

  try {
    const response = await sendCommand("AT+CPIN?");
    console.log("response", response);

    if (response.includes("SIM PIN")) {
      const unlockSIM = await sendCommand(`AT+CPIN=${process.env.SIM_PIN}`);
      console.log("unlockSIM", unlockSIM);
    }

    // set Duty Officer
    const setDTOResponse = await sendCommand(`AT+CCFC=0,3,"${phoneNumber}"\r`);
    console.log("setDTOResponse", setDTOResponse);
  } catch (error) {
    console.log("crap!", error);
  }
}

test();

// startSerialPort();
