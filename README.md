# 🛍️ My Shop - E-Commerce Website
## Setup Guide (Step by Step)

---

## 📋 What You Need Before Starting
- Node.js installed (https://nodejs.org — download LTS version)
- A Google account (for Firebase)
- The project folder (this folder you downloaded)

---

## 🔥 STEP 1: Set Up Firebase

### 1.1 Create a Service Account Key
1. Go to: https://console.firebase.google.com/
2. Open your project: **my-shop-7ecd4**
3. Click the ⚙️ gear icon → **Project settings**
4. Click the **Service accounts** tab
5. Click **"Generate new private key"** button
6. A file will download — **rename it to `serviceAccountKey.json`**
7. **Move this file into your project folder** (same place as `server.js`)

⚠️ **IMPORTANT: Never share this file with anyone. Keep it secret!**

### 1.2 Enable Firestore
1. In Firebase Console, click **"Firestore Database"** in the left menu
2. If not created yet, click **"Create database"**
3. Choose **"Start in test mode"** (you can secure it later)
4. Choose a location (e.g., `europe-west1`) → Click **Enable**

That's it for Firebase! ✅

---

## 💻 STEP 2: Install & Run the Project

### 2.1 Open Terminal in the project folder
- On **Windows**: Right-click the folder → "Open in Terminal" (or use CMD)
- On **Mac**: Right-click the folder → "New Terminal at Folder"

### 2.2 Install dependencies
```bash
npm install
```
Wait for it to finish (may take 1-2 minutes)

### 2.3 Start the server
```bash
npm start
```

You should see:
```
✅ Firebase connected successfully
🚀 Server running at http://localhost:3000
📦 Shop: http://localhost:3000
🔐 Admin: http://localhost:3000/admin-login.html
```

### 2.4 Open your browser
- **Shop homepage**: http://localhost:3000
- **Admin panel**: http://localhost:3000/admin-login.html

---

## 🔐 STEP 3: Login to Admin Panel

1. Go to: http://localhost:3000/admin-login.html
2. Default password: **`admin123`**
3. ⚠️ **Change the password!** Open `public/admin-login.html`, find this line:
   ```javascript
   const ADMIN_PASSWORD = 'admin123';
   ```
   Change `admin123` to your own password.

---

## 🛍️ STEP 4: Add Your First Products

1. Login to admin panel
2. Click the **"Products"** tab
3. Fill in:
   - Product Name (required)
   - Price (required)
   - Sale Price (optional — leave empty for no discount)
   - Category (e.g., "Necklaces", "Rings", "Earrings")
   - Description
   - Upload one or more product images
4. Click **"+ Add Product"**

---

## 🏷️ STEP 5: Add Categories

1. In admin panel, click **"Categories"** tab
2. Type a category name (e.g., "Necklaces")
3. Click **"+ Add"**
4. These will appear on the homepage categories bar

---

## ⚙️ STEP 6: Customize Settings

In admin panel → **"Settings"** tab:
- **Hero Banner**: Change the heading, subtitle, and button text on the homepage
- **Offers Banner**: Enable a promotional banner (e.g., "Spend $50 to get 30% off!")

---

## 📦 How Orders Work

1. Customer visits your shop
2. Adds items to cart
3. Clicks "Checkout" → fills in their name, phone, address
4. Clicks "Place Order via WhatsApp"
5. WhatsApp opens with a pre-filled message sent to your number: **+96170621593**
6. You can view all orders in Admin → **"Orders"** tab
7. Update order status (Pending → Processing → Shipped → Delivered)

---

## 🌐 Making it Live (Optional)

To make your website accessible on the internet:

### Option A: Railway (Easy, Free)
1. Go to https://railway.app
2. Create account → New Project → Deploy from GitHub
3. Upload your project to GitHub first
4. Add environment variable or just push with the serviceAccountKey.json

### Option B: VPS/Hostinger
1. Buy a VPS
2. Install Node.js on it
3. Upload your files via FTP
4. Run `npm install` then `npm start`
5. Use PM2 to keep it running: `pm2 start server.js`

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| `Cannot find module './serviceAccountKey.json'` | Make sure you downloaded and placed the Firebase service account key file |
| `Firebase connection error` | Check that Firestore is enabled in your Firebase project |
| Products don't show | Add some products via admin panel first |
| Images not uploading | Check your internet connection (ImgBB requires internet) |
| Port 3000 already in use | Change port in server.js: `const PORT = 3001` |

---

## 📱 Pages Overview

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Product grid, hero banner, categories |
| Product | `/product.html?id=XXX` | Product details, ratings, related items |
| Cart | `/cart.html` | Shopping cart |
| Checkout | `/checkout.html` | Order form → WhatsApp |
| Admin Login | `/admin-login.html` | Password: admin123 |
| Admin Panel | `/admin.html` | Manage products, orders, settings |

---

## 🎨 Customization

### Change Shop Name
Search for `"✦ My Shop"` in all HTML files and replace with your shop name.

### Change WhatsApp Number
Search for `96170621593` in all files and replace with your number.

### Change Colors
In `public/style.css`, edit these lines at the top:
```css
--navy: #1a1a2e;    /* Main dark color */
--gold: #c9a84c;    /* Accent/gold color */
```

---

## 🔑 Admin Password
Default: `admin123`
To change: Edit `public/admin-login.html`, line:
```javascript
const ADMIN_PASSWORD = 'admin123';
```

---

Made with ❤️ using Node.js + Firebase + ImgBB
