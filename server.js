const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

  sendJson(res, 200, {
    success: true,
    order: Array.isArray(inserted) ? inserted[0] : orderRecord
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
