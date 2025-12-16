
const { getAllOfficers } = require('./src/services/dutyOfficerService');
try {
  const officers = getAllOfficers();
  console.log(JSON.stringify(officers.map(o => o.name), null, 2));
} catch (e) {
  console.error(e);
}
