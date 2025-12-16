
const { getDutyOfficer } = require('./src/services/dutyOfficerService');

console.log('=== Testing Duty Officer Rotation ===\n');

// Test cases
const testCases = [
  { desc: 'Current (Dec 16)', date: new Date('2025-12-16T12:00:00'), expected: 'Eli' },
  { desc: 'Before Rotation (Dec 21 9:59am)', date: new Date('2025-12-21T09:59:00'), expected: 'Eli' },
  { desc: 'Rotation Time (Dec 21 10:00am)', date: new Date('2025-12-21T10:00:00'), expected: 'Lukas' },
  { desc: 'After Rotation (Dec 21 10:01am)', date: new Date('2025-12-21T10:01:00'), expected: 'Lukas' },
  { desc: 'Next Week (Dec 28 10:00am)', date: new Date('2025-12-28T10:00:00'), expected: 'Glen' } // Should wrap to Glen
];

testCases.forEach(test => {
  const officer = getDutyOfficer(test.date);
  console.log(`${test.desc}:`);
  console.log(`  Date: ${test.date.toLocaleString()}`);
  console.log(`  Officer: ${officer.name}`);
  console.log(`  Expected: ${test.expected}`);
  console.log(`  Match: ${officer.name === test.expected ? '✅' : '❌'}`);
  console.log('');
});
