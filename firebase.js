const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// You need to download your service account key from Firebase Console
// Go to: Project Settings > Service Accounts > Generate New Private Key
// Save it as 'serviceAccountKey.json' in the root of this project

let db;

try {
  if (!admin.apps.length) {
    // Option 1: Using service account key file (recommended)
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: 'my-shop-7ecd4'
    });
  }
  db = admin.firestore();
  console.log('✅ Firebase connected successfully');
} catch (error) {
  console.error('❌ Firebase connection error:', error.message);
  console.log('📋 Make sure serviceAccountKey.json exists in the project root');
  process.exit(1);
}

module.exports = { db, admin };
