export function getDutyOfficer(date) {
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
