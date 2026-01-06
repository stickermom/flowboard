
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

// 1. Read .env.local manually to get the secret
const envPath = path.join(__dirname, '..', '.env.local');
let secret = '';
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/RAZORPAY_WEBHOOK_SECRET=(.*)/);
  if (match) {
    secret = match[1].trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
  }
} catch (e) {
  console.error('Could not read .env.local');
  process.exit(1);
}

if (!secret) {
  console.error('RAZORPAY_WEBHOOK_SECRET not found in .env.local');
  process.exit(1);
}

console.log('Using Secret from .env.local:', secret.substring(0, 3) + '...');

// 2. Create Dummy Payload
const payload = JSON.stringify({
  entity: 'event',
  account_id: 'acc_test',
  event: 'payment.captured',
  contains: ['payment'],
  payload: {
    payment: {
      entity: {
        id: 'pay_test_123',
        order_id: 'order_test_123',
        notes: {
            flowboard_order_id: 'some_db_id'
        }
      }
    }
  },
  created_at: 1234567890
});

// 3. Generate Signature
const signature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

console.log('Generated Signature:', signature);

// 4. Send Request
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/razorpay/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-razorpay-signature': signature,
    'Content-Length': payload.length
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(payload);
req.end();
