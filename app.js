const { SerialPort, ReadlineParser } = require("serialport");

const parser = new ReadlineParser();

const port = new SerialPort(
  {
    path: "/dev/ttyUSB2",
    baudRate: 115200,
  },
  (err) => {
    console.log("Init");
    if (err) console.log("Error", err, err.message);
  }
);

let isSimReady = false;

port.pipe(parser);

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
