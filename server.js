const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const nodemailer = require('nodemailer');

// Email configuration
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'gmail';
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'AppVault';

// Initialize email transporter
let emailTransporter = null;
if (EMAIL_USER && EMAIL_PASS) {
  emailTransporter = nodemailer.createTransport({
    service: EMAIL_SERVICE,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });
}

// Function to send license key email
async function sendLicenseKeyEmail(customerEmail, appName, licenseKey, downloadUrl, tutorialUrl) {
  if (!emailTransporter) {
    console.warn('⚠️ Email transporter not configured. Skipping email.');
    return;
  }

  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #7c6fff 0%, #5548e8 100%); color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">🎉 Purchase Successful!</h1>
      </div>
      <div style="padding: 30px;">
        <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
          Thank you for purchasing <strong>${appName}</strong>! Your license key is ready.
        </p>
        <div style="background: #f5f5f5; border: 2px dashed #7c6fff; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
          <p style="color: #999; font-size: 12px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Your Product Key</p>
          <p style="font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; color: #7c6fff; margin: 0; word-break: break-all; letter-spacing: 2px;">
            ${licenseKey}
          </p>
        </div>
        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="color: #856404; margin: 0; font-weight: bold;">⚠️ Keep This Safe</p>
          <p style="color: #856404; margin: 5px 0 0 0; font-size: 13px;">Your license key is your proof of purchase. Save it in a safe place.</p>
        </div>
        <div style="display: flex; gap: 10px; margin: 25px 0; flex-wrap: wrap;">
          <a href="${downloadUrl}" style="flex: 1; min-width: 140px; background: #7c6fff; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; text-align: center; font-weight: 600;">⬇️ Download</a>
          <a href="${tutorialUrl}" style="flex: 1; min-width: 140px; background: #e0e0e0; color: #333; padding: 12px 20px; text-decoration: none; border-radius: 6px; text-align: center; font-weight: 600;">📚 Tutorial</a>
        </div>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="color: #333; margin: 0 0 10px 0; font-size: 14px;">Next Steps:</h3>
          <ol style="color: #666; margin: 0; padding-left: 20px; font-size: 13px;">
            <li style="margin-bottom: 8px;">Download the app using the button above</li>
            <li style="margin-bottom: 8px;">Watch the tutorial for setup instructions</li>
            <li style="margin-bottom: 8px;">Enter your license key when prompted during installation</li>
            <li>Enjoy! 🚀</li>
          </ol>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 25px; border-top: 1px solid #e0e0e0; padding-top: 15px;">Need help? Check our documentation or contact support.</p>
      </div>
      <div style="background: #f5f5f5; padding: 15px; text-align: center; border-top: 1px solid #e0e0e0;">
        <p style="color: #999; font-size: 11px; margin: 0;">© 2025 ${EMAIL_FROM_NAME}. All rights reserved.</p>
      </div>
    </div>
  `;

  try {
    await emailTransporter.sendMail({
      from: `${EMAIL_FROM_NAME} <${EMAIL_USER}>`,
      to: customerEmail,
      subject: `Your ${appName} License Key - ${licenseKey}`,
      html: emailContent,
      text: `Your license key for ${appName}: ${licenseKey}\n\nKeep this safe!`
    });
    console.log(`✅ License key email sent to ${customerEmail}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${customerEmail}:`, error.message);
  }
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (!key || process.env[key]) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = __dirname;
const INDEX_FILE = path.join(ROOT_DIR, 'index.html');
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Log configuration status on startup
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.warn('⚠️  WARNING: Razorpay credentials not found in .env');
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  WARNING: Supabase credentials not found in .env');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function isConfigured() {
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function generateReceipt(appId) {
  const suffix = crypto.randomBytes(4).toString('hex');
  return `app_${appId}_${Date.now()}_${suffix}`.slice(0, 40);
}

function generateLicenseKey(appName) {
  const slug = String(appName || 'APP')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5)
    .padEnd(5, 'X');

  const parts = Array.from({ length: 3 }, () => crypto.randomBytes(3).toString('hex').slice(0, 5).toUpperCase());
  return `${slug}-${parts.join('-')}`;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function createPasswordHash(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, account) {
  if (!account?.password_salt || !account?.password_hash) return false;
  const { hash } = createPasswordHash(password, account.password_salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(account.password_hash, 'hex'));
}

async function supabaseRequest(resource, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${resource}`, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      ...(options.method && options.method !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.hint || text || 'Supabase request failed';
    throw new Error(message);
  }

  return data;
}

async function getAppById(appId) {
  const rows = await supabaseRequest(`apps?id=eq.${encodeURIComponent(appId)}&select=id,name,price,download_url,tutorial_url`);
  return Array.isArray(rows) ? rows[0] : null;
}

async function getOrderAccessAccount(email) {
  const rows = await supabaseRequest(
    `order_access_accounts?customer_email=eq.${encodeURIComponent(email)}&select=customer_email,password_hash,password_salt`
  );
  return Array.isArray(rows) ? rows[0] : null;
}

async function createOrderAccessAccount(email, password) {
  const { salt, hash } = createPasswordHash(password);
  const rows = await supabaseRequest('order_access_accounts', {
    method: 'POST',
    headers: {
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      customer_email: email,
      password_hash: hash,
      password_salt: salt
    })
  });
  return Array.isArray(rows) ? rows[0] : null;
}

async function verifyOrCreateOrderAccess({ email, password, confirmPassword, allowCreate }) {
  const normalizedEmail = normalizeEmail(email);
  const safePassword = String(password || '');
  const safeConfirmPassword = String(confirmPassword || '');

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new Error('A valid email address is required.');
  }

  if (safePassword.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const existingAccount = await getOrderAccessAccount(normalizedEmail);
  if (existingAccount) {
    if (!verifyPassword(safePassword, existingAccount)) {
      throw new Error('Incorrect key access password.');
    }
    return { email: normalizedEmail, created: false };
  }

  if (!allowCreate) {
    throw new Error('No key access password found for this email.');
  }

  if (!safeConfirmPassword) {
    throw new Error('Please confirm your password.');
  }

  if (safePassword !== safeConfirmPassword) {
    throw new Error('Passwords do not match.');
  }

  await createOrderAccessAccount(normalizedEmail, safePassword);
  return { email: normalizedEmail, created: true };
}

async function createRazorpayOrder({ amount, currency, receipt, notes }) {
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt,
      payment_capture: 1,
      notes
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.description || 'Could not create Razorpay order');
  }

  return data;
}

async function getOrdersByEmail(email) {
  return supabaseRequest(
    `orders?customer_email=eq.${encodeURIComponent(email)}&status=eq.paid&select=id,app_name,customer_email,license_key,download_url,tutorial_url,amount,currency,created_at,razorpay_payment_id&order=created_at.desc`
  );
}

async function handleGetMyKeys(req, res) {
  const { email, password } = await readRequestBody(req);
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    sendJson(res, 400, { error: 'A valid email address is required.' });
    return;
  }

  if (!password) {
    sendJson(res, 400, { error: 'Password is required.' });
    return;
  }

  const account = await getOrderAccessAccount(normalizedEmail);
  if (!account || !verifyPassword(password, account)) {
    sendJson(res, 401, { error: 'Incorrect email or password.' });
    return;
  }

  const orders = await getOrdersByEmail(normalizedEmail);
  sendJson(res, 200, {
    success: true,
    orders: Array.isArray(orders) ? orders : []
  });
}

function verifySignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function handleCreateOrder(req, res) {
  if (!isConfigured()) {
    console.error('❌ handleCreateOrder: Missing configuration');
    console.error('   RAZORPAY_KEY_ID:', RAZORPAY_KEY_ID ? '✓ Set' : '✗ Missing');
    console.error('   RAZORPAY_KEY_SECRET:', RAZORPAY_KEY_SECRET ? '✓ Set' : '✗ Missing');
    console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓ Set' : '✗ Missing');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Missing');
    sendJson(res, 500, { error: 'Server configuration incomplete. Check terminal for details.' });
    return;
  }

  const { appId, email, referralCode, amount, receipt, accessPassword, confirmAccessPassword } = await readRequestBody(req);
  const normalizedEmail = normalizeEmail(email);

  if (!appId) {
    sendJson(res, 400, { error: 'Missing appId.' });
    return;
  }

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    sendJson(res, 400, { error: 'A valid email address is required.' });
    return;
  }

  if (appId !== 'fortune-wheel') {
    await verifyOrCreateOrderAccess({
      email: normalizedEmail,
      password: accessPassword,
      confirmPassword: confirmAccessPassword,
      allowCreate: true
    });
  }

  let orderAmount;
  let app = null;
  let orderReceipt = receipt || generateReceipt(appId);

  // Handle fortune wheel payments
  if (appId === 'fortune-wheel') {
    orderAmount = Math.max(1000, Math.min(10000000, Number(amount) || 10000));
    if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
      sendJson(res, 400, { error: 'Invalid amount for fortune payment.' });
      return;
    }
  } else {
    // Handle regular app purchases
    app = await getAppById(appId);
    if (!app) {
      sendJson(res, 404, { error: 'App not found.' });
      return;
    }

    orderAmount = Number(app.price) * 100;
    if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
      sendJson(res, 400, { error: 'App price is invalid.' });
      return;
    }
    orderReceipt = generateReceipt(app.id);
  }

  const order = await createRazorpayOrder({
    amount: orderAmount,
    currency: 'INR',
    receipt: orderReceipt,
    notes: {
      app_id: appId === 'fortune-wheel' ? 'fortune' : String(app.id),
      app_name: appId === 'fortune-wheel' ? 'Fortune Wheel' : String(app.name || ''),
      email: normalizedEmail,
      referral_code: String(referralCode || '').trim()
    }
  });

  sendJson(res, 200, {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: RAZORPAY_KEY_ID,
    app: appId === 'fortune-wheel' ? {
      id: 'fortune-wheel',
      name: 'Fortune Wheel',
      price: orderAmount / 100,
      downloadUrl: '#',
      tutorialUrl: '#'
    } : {
      id: app.id,
      name: app.name,
      price: Number(app.price),
      downloadUrl: app.download_url || '#',
      tutorialUrl: app.tutorial_url || '#'
    }
  });
}

async function handleVerifyPayment(req, res) {
  if (!isConfigured()) {
    console.error('❌ handleVerifyPayment: Missing configuration');
    sendJson(res, 500, { error: 'Server configuration incomplete. Check terminal for details.' });
    return;
  }

  const {
    appId,
    email,
    referralCode,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature
  } = await readRequestBody(req);

  const normalizedEmail = normalizeEmail(email);

  if (!appId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    sendJson(res, 400, { error: 'Missing Razorpay verification payload.' });
    return;
  }

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    sendJson(res, 400, { error: 'A valid email address is required.' });
    return;
  }

  let app = null;
  if (appId !== 'fortune-wheel') {
    app = await getAppById(appId);
    if (!app) {
      sendJson(res, 404, { error: 'App not found.' });
      return;
    }
  }

  if (!verifySignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature
  })) {
    sendJson(res, 400, { error: 'Payment signature verification failed.' });
    return;
  }

  const existingOrders = await supabaseRequest(
    `orders?razorpay_payment_id=eq.${encodeURIComponent(razorpayPaymentId)}&select=*`
  );

  const existingOrder = Array.isArray(existingOrders) ? existingOrders[0] : null;
  if (existingOrder) {
    sendJson(res, 200, {
      success: true,
      order: existingOrder
    });
    return;
  }

  const orderRecord = {
    app_id: appId === 'fortune-wheel' ? 'fortune' : app.id,
    app_name: appId === 'fortune-wheel' ? 'Fortune Wheel' : app.name,
    customer_email: normalizedEmail,
    amount: appId === 'fortune-wheel' ? 'N/A' : Number(app.price),
    currency: 'INR',
    referral_code: String(referralCode || '').trim() || null,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    payment_signature: razorpaySignature,
    license_key: appId === 'fortune-wheel' ? 'FORTUNE-' + Date.now() : generateLicenseKey(app.name),
    download_url: appId === 'fortune-wheel' ? '' : (app.download_url || '#'),
    tutorial_url: appId === 'fortune-wheel' ? '' : (app.tutorial_url || '#'),
    status: 'paid'
  };

const inserted = await supabaseRequest('orders', {
  method: 'POST',
  headers: {
    Prefer: 'return=representation'
  },
  body: JSON.stringify(orderRecord)
});

// Send license key email to customer
const finalOrder = Array.isArray(inserted) ? inserted[0] : orderRecord;
if (finalOrder.license_key) {
  await sendLicenseKeyEmail(
    normalizedEmail,
    appId === 'fortune-wheel' ? 'Fortune Wheel' : app.name,
    finalOrder.license_key,
    finalOrder.download_url || '#',
    finalOrder.tutorial_url || '#'
  );
}

sendJson(res, 200, {
  success: true,
  order: finalOrder
});
}

function serveStatic(req, res) {
  let requestedPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  if (requestedPath === '/') {
    requestedPath = '/index.html';
  }

  const resolvedPath = path.join(ROOT_DIR, requestedPath);
  if (!resolvedPath.startsWith(ROOT_DIR)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(resolvedPath, (error, file) => {
    if (error) {
      if (requestedPath !== '/index.html') {
        fs.readFile(INDEX_FILE, (indexError, html) => {
          if (indexError) {
            sendText(res, 404, 'Not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
        });
        return;
      }

      sendText(res, 404, 'Not found');
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(file);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }

    const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;

    if (req.method === 'GET' && pathname === '/api/health') {
      sendJson(res, 200, {
        status: 'ok',
        configured: isConfigured(),
        credentials: {
          razorpay: Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET),
          supabase: Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
        }
      });
      return;
    }

    if (req.method === 'POST' && pathname === '/api/create-order') {
      await handleCreateOrder(req, res);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/verify-payment') {
      await handleVerifyPayment(req, res);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/my-keys') {
      await handleGetMyKeys(req, res);
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: error.message || 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`AppVault server running on http://localhost:${PORT}`);
});
