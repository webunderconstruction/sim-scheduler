// Test script to verify rotation changes at Sunday 10am
const { getDutyOfficer } = require('./src/services/dutyOfficerService');

console.log('=== Testing Duty Officer Rotation at Sunday 10am ===\n');

// Test cases
const testCases = [
  { desc: 'NOW', date: new Date() },
  { desc: 'Sunday 9:59am (before rotation)', date: new Date('2025-01-19T09:59:00') },
  { desc: 'Sunday 10:00am (rotation time)', date: new Date('2025-01-19T10:00:00') },
  { desc: 'Sunday 10:01am (after rotation)', date: new Date('2025-01-19T10:01:00') },
  { desc: 'Monday 10:00am', date: new Date('2025-01-20T10:00:00') },
  { desc: 'Saturday 10:00am', date: new Date('2025-01-25T10:00:00') },
  { desc: 'Next Sunday 9:59am', date: new Date('2025-01-26T09:59:00') },
  { desc: 'Next Sunday 10:00am', date: new Date('2025-01-26T10:00:00') },
];

testCases.forEach(({ desc, date }) => {
  const officer = getDutyOfficer(date);
  console.log(`${desc}:`);
  console.log(`  Date: ${date.toLocaleString()}`);
  console.log(`  Officer: ${officer.name}`);
  console.log('');
});
