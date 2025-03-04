const shiftWorkers = require("./brigadeOfficers.json");

function getDutyOfficer(date = new Date()) {
  const startDate = new Date("2025-01-21 18:05"); // Start date Saturday

  // Calculate the number of weeks passed since the start date
  const timeDiff = Math.abs(date.getTime() - startDate.getTime());
  const weeksPassed = Math.ceil(timeDiff / (1000 * 3600 * 24 * 7));

  // Calculate the index of the shift worker based on the number of weeks passed
  const workerIndex = (weeksPassed - 1) % shiftWorkers.length;

  return shiftWorkers[workerIndex];
}

function getDutyOfficerByPhoneNumber(phoneNumber) {
  const officer = shiftWorkers.find(worker => worker.phoneNumber === phoneNumber);
  return officer ? officer.name : null;
}

function getDutyOfficerPhoneNumberByName(name) {
  const officer = shiftWorkers.find(worker => worker.name === name);
  return officer ? officer.phoneNumber : null;
}

console.log('Current duty officer is:',getDutyOfficer())

module.exports = { getDutyOfficer, getDutyOfficerByPhoneNumber, getDutyOfficerPhoneNumberByName };
