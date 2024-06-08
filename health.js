require("dotenv").config();

const { SerialPort, ReadlineParser } = require("serialport");


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

function sendCommand(command, returnCheckString = 'OK', endOfLine = '\r') {
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
      port.write(`${command}${endOfLine}`);
    });
  });
}


//testing
// async function test() {
//   console.log("sending async command!");

//   try {
//     // check if SIM is locked
//     if (await isSimLocked()) {
//       console.log('SIM is locked, sending unlock command...');
//       const unlockSIM = await sendCommand(`AT+CPIN=${process.env.SIM_PIN}`, '+CPIN: READY');
//       console.log("unlockSIM status", unlockSIM);
//     }

//     console.log("SIM not locked, continuing...");

//     // check if current phone LT DO matches this week's LT DO
//     const currentPh = await getCurrentRedirectNumber();
//     console.log("current phone LT DO", currentPh);

//     if (currentPh !== phoneNumber) {
//       const setDTOResponse = await sendCommand(
//         `AT+CCFC=0,3,"${phoneNumber}"\r`
//       );
//       console.log("setDTOResponse", setDTOResponse);
//     }
//   } catch (error) {
//     console.log("crap!", error);
//   }
// }

async function healthCheck() {
  try {

    console.log('Sending health check command');
    // set sms text mode
    await sendCommand('AT+CMGF=1');
    // set phone number
    const healthResponse = await sendCommand(`AT+CMGS="${process.env.HEALTH_CHECK}"\r\n HealthCheck \x1A ^z`);
    // set text
    // await sendCommand('HealthCheck', '', '\r\n');
    // // send sms
    // await sendCommand('\x1A');
    // const healthResponse = await sendCommand('^z')
    console.log("Health response", healthResponse);
    
  } catch (error) {

    console.log("crap!", error);
    
  }
}

healthCheck()

//test();

// startSerialPort();
