const { SerialPort, ReadlineParser } = require("serialport");

const parser = new ReadlineParser();

let isSimReady = false;

let port;

function startSerialPort(port) {
  port = new SerialPort(
    {
      path: "/dev/ttyUSB2",
      baudRate: 115200,
    },
    (err) => {
      console.log("Init");
      if (err) console.log("Error", err, err.message);
    }
  );

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
}

function setCallForward(phoneNumber) {
  // +61409991553
  port.write(`AT+CCFC=0,3,"${phoneNumber}"\r`);
}

function unlockSIM() {
  const PIN = process.env.SIM_PIN;
  port.write(`AT+CPIN="${PIN}"\r`);
}

function getDutyOfficer(date) {
  const shiftWorkers = [
    { name: "Glen", phoneNumber: "+61409991553" },
    { name: "Lukas", phoneNumber: "+61409991553" },
    { name: "Dan", phoneNumber: "+61409991553" },
    { name: "Peter", phoneNumber: "+61409991553" },
  ];
  const startDate = new Date("2024-02-10"); // Start date Saturday

  // Calculate the number of weeks passed since the start date
  const timeDiff = Math.abs(date.getTime() - startDate.getTime());
  const weeksPassed = Math.ceil(timeDiff / (1000 * 3600 * 24 * 7));

  // Calculate the index of the shift worker based on the number of weeks passed
  const workerIndex = (weeksPassed - 1) % shiftWorkers.length;

  return shiftWorkers[workerIndex];
}

console.log(getDutyOfficer(new Date()));

startSerialPort();
