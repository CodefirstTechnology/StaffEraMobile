/**
 * Start Expo for physical phones on the same Wi‑Fi.
 * Forces Metro to advertise the PC LAN IP instead of 127.0.0.1.
 */
const { spawn } = require('child_process');
const os = require('os');

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

const lanIp = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || getLanIp();

if (!lanIp) {
  console.error(
    'Could not detect LAN IP. Set REACT_NATIVE_PACKAGER_HOSTNAME in .env or run: npm run start:tunnel',
  );
  process.exit(1);
}

console.log('');
console.log('  StaffEra House Owner — mobile dev server');
console.log(`  LAN IP: ${lanIp}`);
console.log(`  Expo Go URL: exp://${lanIp}:8081 (port may change if busy)`);
console.log('  Phone and PC must be on the same Wi‑Fi.');
console.log('  If QR scan still fails, run: npm run start:tunnel');
console.log('');

const child = spawn('npx expo start --lan -c', {
  stdio: 'inherit',
  env: {
    ...process.env,
    REACT_NATIVE_PACKAGER_HOSTNAME: lanIp,
  },
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
