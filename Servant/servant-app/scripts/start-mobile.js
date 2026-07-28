/**
 * Start Expo for physical phones on the same Wi‑Fi.
 * Forces Metro to advertise the PC LAN IP instead of 127.0.0.1.
 */
const { spawn } = require('child_process');
const os = require('os');

function getLanIp() {
  const nets = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        const isVirtual =
          name.includes('Local Area Connection*') ||
          name.includes('vEthernet') ||
          name.includes('Virtual') ||
          name.includes('VMware') ||
          name.includes('vboxnet') ||
          net.address.startsWith('192.168.137.');

        const isPreferred =
          name.toLowerCase().includes('wi-fi') ||
          name.toLowerCase().includes('ethernet');

        candidates.push({ name, address: net.address, isVirtual, isPreferred });
      }
    }
  }

  const preferred = candidates.find((c) => c.isPreferred && !c.isVirtual);
  if (preferred) return preferred.address;

  const nonVirtual = candidates.find((c) => !c.isVirtual);
  if (nonVirtual) return nonVirtual.address;

  return candidates[0]?.address || null;
}

const lanIp = process.env.REACT_NATIVE_PACKAGER_HOSTNAME || getLanIp();

if (!lanIp) {
  console.error(
    'Could not detect LAN IP. Set REACT_NATIVE_PACKAGER_HOSTNAME in .env or run: npm run start:tunnel',
  );
  process.exit(1);
}

console.log('');
console.log('  StaffEra Servant — mobile dev server');
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
