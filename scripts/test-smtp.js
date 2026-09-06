/**
 * AniFlix SMTP Integration Test Script
 * 
 * Usage:
 *   node ./scripts/test-smtp.js [recipient_email]
 * 
 * Example:
 *   node ./scripts/test-smtp.js target@gmail.com
 */

const net = require('net');
const tls = require('tls');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env if present
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...vals] = trimmed.split('=');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = vals.join('=').trim();
      }
    }
  });
}

const HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const USER = process.env.SMTP_USER || 'esra2002.netbti@gmail.com';
const PASS = process.env.SMTP_PASS || 'kolbqyjjacmgovwv';
const TARGET = process.argv[2] || USER;

console.log('=====================================================');
console.log('       AniFlix SMTP Integration Tester               ');
console.log('=====================================================');
console.log(`[Config] Host:     ${HOST}:${PORT}`);
console.log(`[Config] User:     ${USER}`);
console.log(`[Config] Pass:     ${PASS ? '*** (Configured)' : 'MISSING'}`);
console.log(`[Config] Target:   ${TARGET}`);
console.log('-----------------------------------------------------\n');

let socket = net.connect(PORT, HOST);
let activeSocket = socket;
let step = 0;

function send(s, data) {
  console.log(`[OUT] ${data.startsWith('AUTH') || step === 6 || step === 7 ? '*** REDACTED ***' : data}`);
  s.write(data + '\r\n');
}

function handleData(dataStr) {
  const lines = dataStr.trim().split('\n');
  for (const l of lines) {
    console.log(`[IN]  ${l.trim()}`);
  }
  const code = dataStr.substring(0, 3);

  if (step === 0 && code === '220') {
    step = 1;
    send(activeSocket, 'EHLO localhost');
  } else if (step === 1 && code === '250') {
    step = 2;
    send(activeSocket, 'STARTTLS');
  } else if (step === 2 && code === '220') {
    step = 3;
    console.log('\n[TLS] Negotiating SSL/TLS encrypted channel...');
    const tlsSocket = tls.connect({
      socket: socket,
      servername: HOST,
      rejectUnauthorized: false
    }, () => {
      console.log('[TLS] Encrypted channel established successfully!\n');
      activeSocket = tlsSocket;
      step = 4;
      send(activeSocket, 'EHLO localhost');
    });

    tlsSocket.on('data', (d) => handleData(d.toString()));
    tlsSocket.on('error', (err) => console.error('[TLS Error]', err.message));
  } else if (step === 4 && code === '250') {
    step = 5;
    send(activeSocket, 'AUTH LOGIN');
  } else if (step === 5 && code === '334') {
    step = 6;
    send(activeSocket, Buffer.from(USER).toString('base64'));
  } else if (step === 6 && code === '334') {
    step = 7;
    send(activeSocket, Buffer.from(PASS).toString('base64'));
  } else if (step === 7) {
    if (code === '235') {
      console.log('\n=====================================================');
      console.log('✅ AUTHENTICATION SUCCESS: Credentials Accepted!');
      console.log('=====================================================\n');
      step = 8;
      send(activeSocket, `MAIL FROM:<${USER}>`);
    } else {
      console.error('\n❌ AUTHENTICATION FAILED: Invalid credentials or App Password.');
      process.exit(1);
    }
  } else if (step === 8 && code === '250') {
    step = 9;
    send(activeSocket, `RCPT TO:<${TARGET}>`);
  } else if (step === 9 && code === '250') {
    step = 10;
    send(activeSocket, 'DATA');
  } else if (step === 10 && code === '354') {
    step = 11;
    const msg = [
      `From: AniFlix Support <${USER}>`,
      `To: <${TARGET}>`,
      `Subject: AniFlix SMTP API Verification Test`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      `Success! The AniFlix SMTP integration with Gmail App Password is working correctly.`,
      `Verified At: ${new Date().toLocaleString()}`,
      `.`
    ].join('\r\n');
    send(activeSocket, msg);
  } else if (step === 11 && code === '250') {
    console.log('\n=====================================================');
    console.log(`✅ EMAIL DELIVERED: Test message sent to ${TARGET}`);
    console.log('=====================================================\n');
    send(activeSocket, 'QUIT');
    setTimeout(() => process.exit(0), 500);
  }
}

socket.on('data', (d) => {
  if (step < 3) handleData(d.toString());
});

socket.on('error', (err) => {
  console.error('[Socket Error]', err.message);
});
