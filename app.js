const { SerialPort, ReadlineParser } = require("serialport");
const { getDutyOfficer } = require("./dutyOfficer");

const parser = new ReadlineParser();

// let isSimReady = false;

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

port.pipe(parser);

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

function setCallForward(phoneNumber) {
  // +61409991553
  port.write(`AT+CCFC=0,3,"${phoneNumber}"\r`);
}

function unlockSIM() {
  const PIN = process.env.SIM_PIN;
  port.write(`AT+CPIN="${PIN}"\r`);
}

function sendCommand(command) {
  return new Promise((resolve, reject) => {
    //open port
    port.open((error) => {
      if (error) {
        reject(error);
      }
      port.write(command);
    });

    parser.on("data", (data) => {
      console.log("...waiting for delicious data", data.length, data);
      // send if first thing that comes back
      if (data.length > 1) {
        resolve(data);
      }

      // if after 60 seconds we don't get any data more than 1 char, we reject
      setTimeout(() => {
        reject("Timeout");
      }, 60000);
    });
  });
}

//testing
// setTimeout(async () => {
//   console.log("sending async command!");

//   try {
//     const response = await sendCommand("AT+CPIN?\r");
//     console.log("response", response);
//     port.close();
//   } catch (error) {
//     console.log("crap!", error);
//   }
// }, 1000);

console.log("run and quit");

// console.log(getDutyOfficer(new Date()));

// startSerialPort();
