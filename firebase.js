const admin = require('firebase-admin');

let db;

try {
  if (!admin.apps.length) {
    let credential;

    if (process.env.FIREBASE_KEY) {
      // Running on Railway — read from environment variable
      const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
      credential = admin.credential.cert(serviceAccount);
    } else {
      // Running locally — read from file
      const serviceAccount = require('./serviceAccountKey.json');
      credential = admin.credential.cert(serviceAccount);
    }

    admin.initializeApp({
      credential,
      projectId: 'my-shop-7ecd4'
    });
  }

  db = admin.firestore();
  console.log('✅ Firebase connected successfully');
} catch (error) {
  console.error('❌ Firebase connection error:', error.message);
  process.exit(1);
}

module.exports = { db, admin };
