const os = require('os');

const ip = Object.values(os.networkInterfaces())
  .flat()
  .find((i) => i.family === 'IPv4' && !i.internal)?.address;

if (ip) {
  console.log(`\n  Mobile: http://${ip}:4200\n`);
}
