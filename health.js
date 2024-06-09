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


async function healthCheck() {

  port.open((error) => {
    if (error) {
    
      console.log('Error', error);
    }


    setTimeout(function(){
      port.write('AT+CMGF=1\r')
      setTimeout(function(){
        port.write(`AT+CMGS=\"${process.env.HEALTH_CHECK}\"\r`)
          setTimeout(function(){
            port.write('HealthCheck')
              setTimeout(function(){
                port.write('\x1A');
                console.log('HealthCheck sent');
                try {
                  port.close();
                  console.log('Port closed');
                } catch (error) {
                  console.log('Unable to close port', error);
                }
                
              }, 100);
          }, 100);
       }, 100);
   }, 100);

    
  });

}

// 60mins / 1 hr
const interval = 1000 * 60 * 60;



setInterval(() => {
  // check if hours in 8am or 8pm
  const date = new Date();
  const hours = date.getHours();

  if(hours === 8 || hours === 20) {
    console.log('Running health check service');
    healthCheck();
  }

}, interval);

