# AppVault Store - Setup & Deployment Guide

A modern digital products store with Razorpay payment processing, Supabase backend, and community voting features.

## 📋 Project Architecture

```
appvault-store/
├── server.js              # Node.js HTTP server (static file serving + API endpoints)
├── index.html             # Single-page frontend app
├── package.json           # Node.js dependencies
├── .env                   # Environment variables (credentials)
├── supabase-schema.sql    # Database schema for Supabase
└── README.md              # This file
```

## 🔧 Tech Stack

- **Frontend**: Vanilla JavaScript + HTML/CSS (single-page app)
- **Backend**: Node.js HTTP server (no framework)
- **Database**: Supabase (PostgreSQL)
- **Payments**: Razorpay checkout
- **Hosting**: Any Node.js host (Render, Railway, Vercel, etc.)

## 📦 Features

- ✅ App store with product cards and filters
- ✅ Coming Soon ideas section with community voting
- ✅ Community ideas submission (Ideas page)
- ✅ Razorpay payment integration with license key delivery
- ✅ Referral program (30% commission)
- ✅ Admin panel for managing apps, ideas, and settings
- ✅ Email-based order tracking
- ✅ Left sidebar navigation
- ✅ Responsive design

## 🚀 Quick Start

### 1. Prerequisites

Ensure you have:
- Node.js 14+ installed
- A Supabase account ([supabase.com](https://supabase.com))
- A Razorpay merchant account ([razorpay.com](https://razorpay.com))

### 2. Environment Setup

Rename `.env` or update the existing environment variables:

```env
PORT=3000
RAZORPAY_KEY_ID=rzp_test_Savo3Fa3ikvA3s
RAZORPAY_KEY_SECRET=Q8UPZL7eDRGIykc99vfzQYHw
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Get these values:**
- **RAZORPAY_KEY_ID / SECRET**: Dashboard → Settings → API Keys
- **SUPABASE_URL**: Settings → API → Project URL
- **SUPABASE_SERVICE_ROLE_KEY**: Settings → API → Service Role Secret

### 3. Database Setup

1. Go to Supabase dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase-schema.sql`
4. Paste into SQL Editor and execute
5. This creates 4 tables:
   - `apps` - Products/apps for sale
   - `ideas` - Coming soon ideas
   - `submitted_ideas` - User-submitted community ideas
   - `orders` - Purchase orders and licenses

### 4. Supabase Client Key

The `.env` contains the anon key (public key) in the HTML initialization. This is intentional:
- **Frontend** uses anon key (read-only for views)
- **Backend** uses service role key (write operations)

Find your anon key in Supabase → Settings → API → anon public

### 5. Install & Run

```bash
# Install dependencies (minimal - just Node.js built-ins)
npm install

# Start the server
npm start

# Server will run on http://localhost:3000
```

## 📊 Database Schema Overview

### Apps Table
```sql
- id (primary key)
- name, emoji, category
- short_desc, full_desc
- price, currency
- featured (boolean)
- features (array), screenshots (array)
- video_url, download_url, tutorial_url
- upvotes, downvotes (voting system)
```

### Ideas Table (Coming Soon)
```sql
- id (primary key)
- name, emoji
- description
- upvotes, downvotes
```

### Submitted Ideas Table
```sql
- id (primary key)
- name, emoji, category
- description, submitter
- upvotes, downvotes
- created_at (timestamp)
```

### Orders Table
```sql
- id (primary key)
- app_id, app_name
- customer_email
- amount, currency
- reference codes (Razorpay, referral)
- license_key (auto-generated)
- download_url, tutorial_url
- status (paid, pending, etc.)
```

## 🔌 API Endpoints

### 1. Create Order
**POST** `/api/create-order`

Request:
```json
{
  "appId": 1,
  "email": "customer@example.com",
  "referralCode": "EARN-ABC123"
}
```

Response:
```json
{
  "orderId": "order_ABC123...",
  "amount": 49900,
  "currency": "INR",
  "keyId": "rzp_test_...",
  "app": {
    "id": 1,
    "name": "App Name",
    "price": 499,
    "downloadUrl": "https://...",
    "tutorialUrl": "https://..."
  }
}
```

### 2. Verify Payment
**POST** `/api/verify-payment`

Request:
```json
{
  "appId": 1,
  "email": "customer@example.com",
  "referralCode": "EARN-ABC123",
  "razorpay_order_id": "order_ABC123...",
  "razorpay_payment_id": "pay_ABC123...",
  "razorpay_signature": "hex_signature"
}
```

Response:
```json
{
  "success": true,
  "order": {
    "id": 1,
    "app_name": "App Name",
    "customer_email": "customer@example.com",
    "license_key": "APPNA-ABC12-DEF34-GHI56",
    "download_url": "https://...",
    "status": "paid"
  }
}
```

## 🎨 Frontend Features

### Pages
- **Store** (home) - Browse apps and coming soon ideas
- **Ideas** - Submit and vote on community ideas
- **Earn** - Referral program info
- **Admin** - Manage apps, ideas, and settings (password protected)

### Navigation
- Left sidebar (65px) - Store & Ideas
- Bottom navbar - Earn & Admin
- Top navbar - Logo & Earn button

### Voting System
- Users can upvote/downvote apps and ideas
- Votes persist in localStorage
- Real-time sync with Supabase

## 🔐 Security Notes

1. **Razorpay Signature**: Server verifies HMAC-SHA256 signature
2. **Service Role Key**: Only in server `.env`, never sent to frontend
3. **Payment Verification**: Idempotent - duplicate payments return existing order
4. **Admin Panel**: Password protected (set in admin settings)
5. **Email Validation**: Required for checkout
6. **Input Sanitization**: XSS prevention via HTML escaping

## 🚢 Deployment

### Option 1: Render (Recommended)

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repository
4. Set environment variables in Render dashboard
5. Deploy (auto-deploys on push)

### Option 2: Railway

1. Link GitHub repository
2. Set environment variables
3. Deploy (Railway auto-detects Node.js app)

### Option 3: Vercel (With Limitations)

⚠️ **Note**: Vercel functions have 10-second timeout. Use Render/Railway for reliability.

### Option 4: Self-Hosted

```bash
# Install PM2 for process management
npm install -g pm2

# Start server
pm2 start server.js --name "appvault"

# Monitor
pm2 monit
```

## 📝 Adding Products

### Via Admin Panel

1. Log in to admin (password: `admin123`)
2. Click "Admin" → "Apps" tab
3. Click "+ Add App"
4. Fill in details and save
5. App appears on store

### Directly in Supabase

1. Go to Supabase → `apps` table
2. Insert new row:
   ```
   name: "Invoice Generator"
   emoji: "📄"
   category: "Finance"
   price: 499
   featured: true
   short_desc: "Create professional invoices"
   full_desc: "Full description of features"
   download_url: "https://example.com/download"
   tutorial_url: "https://example.com/tutorial"
   ```

## 🐛 Troubleshooting

### "Supabase request failed"
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`
- Verify database tables were created
- Check Supabase RLS policies

### "Could not create Razorpay order"
- Verify `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
- Check Razorpay is set to Test mode for local testing
- Verify amount is > 0

### Payment verification failing
- Ensure server receives exact Razorpay signature
- Verify HMAC secret is correct
- Check order ID and payment ID match

### Admin panel not loading
- Clear localStorage: `localStorage.clear()`
- Default password is `admin123`
- Check browser console for errors

## 📱 Browser Support

- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

Requires:
- ES6+ support
- Fetch API
- LocalStorage

## 📄 License

This project is provided as-is. Modify and use as needed.

## 🤝 Support

For issues:
1. Check Supabase logs
2. Check Razorpay webhook failures
3. Enable JavaScript console for errors
4. Check network tab in browser DevTools

## ✅ Checklist Before Going Live

- [ ] Update Razorpay keys to production
- [ ] Change admin password in settings
- [ ] Add real app download URLs
- [ ] Add tutorial URLs
- [ ] Populate apps table
- [ ] Test end-to-end payment flow
- [ ] Set custom domain/SSL
- [ ] Monitor error logs
- [ ] Set up email notifications (optional)
