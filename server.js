const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Lazy load firebase to give better error messages
let db;
function getDb() {
  if (!db) {
    const firebase = require('./firebase.js');
    db = firebase.db;
  }
  return db;
}

const IMGBB_API_KEY = '86e971094cfd307ebff7cfaf86cb8ad5';

// Upload image to ImgBB
async function uploadToImgBB(buffer, filename) {
  const formData = new FormData();
  formData.append('image', buffer.toString('base64'));
  formData.append('name', filename);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData
  });
  const data = await response.json();
  if (!data.success) throw new Error('ImgBB upload failed: ' + JSON.stringify(data));
  return data.data.url;
}

// ============ PRODUCTS ============

// GET all products
app.get('/products', async (req, res) => {
  try {
    const snapshot = await getDb().collection('products').get();
    const products = [];
    snapshot.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single product
app.get('/products/:id', async (req, res) => {
  try {
    const doc = await getDb().collection('products').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Product not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add product (with image upload)
app.post('/products', upload.array('images', 10), async (req, res) => {
  try {
    const { name, price, description, category, salePrice } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price are required' });

    let images = [];

    // Upload images to ImgBB
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const url = await uploadToImgBB(file.buffer, file.originalname);
        images.push(url);
      }
    }

    // If image URLs provided directly
    if (req.body.imageUrls) {
      const urls = Array.isArray(req.body.imageUrls) ? req.body.imageUrls : [req.body.imageUrls];
      images = [...images, ...urls];
    }

    const productData = {
      name,
      price: parseFloat(price),
      description: description || '',
      category: category || '',
      images,
      image: images[0] || '',
      views: 0,
      sold: 0,
      ratings: [],
      averageRating: 0,
      ratingsCount: 0,
      createdAt: new Date()
    };
    if (req.body.stock !== undefined && req.body.stock !== '') {
      productData.stock = parseInt(req.body.stock);
    }

    if (salePrice && parseFloat(salePrice) > 0) {
      productData.salePrice = parseFloat(salePrice);
      productData.salePercentage = Math.round(((parseFloat(price) - parseFloat(salePrice)) / parseFloat(price)) * 100);
    }

    const docRef = await getDb().collection('products').add(productData);
    res.json({ id: docRef.id, ...productData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update product
app.put('/products/:id', upload.array('images', 10), async (req, res) => {
  try {
    const { name, price, description, category, salePrice, existingImages } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (price) updateData.price = parseFloat(price);
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;

    const salePriceNum = parseFloat(salePrice) || 0;
    if (salePriceNum > 0 && price && salePriceNum < parseFloat(price)) {
      updateData.salePrice = salePriceNum;
      updateData.salePercentage = Math.round(((parseFloat(price) - salePriceNum) / parseFloat(price)) * 100);
    } else {
      updateData.salePrice = null;
      updateData.salePercentage = null;
    }

    // Start with existing images that were kept (sent from frontend)
    let finalImages = [];
    if (existingImages) {
      try {
        const parsed = JSON.parse(existingImages);
        finalImages = Array.isArray(parsed) ? parsed : [];
      } catch(e) { finalImages = []; }
    }
    console.log('existingImages received:', finalImages.length, 'images');

    // Upload any new images and add them
    if (req.files && req.files.length > 0) {
      console.log('Uploading', req.files.length, 'new images...');
      for (const file of req.files) {
        const url = await uploadToImgBB(file.buffer, file.originalname);
        finalImages.push(url);
      }
    }

    updateData.images = finalImages;
    updateData.image = finalImages[0] || '';
    console.log('Final images saved:', finalImages.length);
    // Handle stock
    const stockVal = req.body.stock;
    if (stockVal !== undefined && stockVal !== '') {
      updateData.stock = parseInt(stockVal);
    } else if (stockVal === '') {
      updateData.stock = null;
    }

    await getDb().collection('products').doc(req.params.id).update(updateData);
    res.json({ success: true, id: req.params.id, ...updateData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE product
app.delete('/products/:id', async (req, res) => {
  try {
    await getDb().collection('products').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Increment product views
app.post('/products/:id/view', async (req, res) => {
  try {
    await getDb().collection('products').doc(req.params.id).update({
      views: require('firebase-admin').firestore.FieldValue.increment(1)
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rate product
app.post('/products/:id/rate', async (req, res) => {
  try {
    const { stars, userId } = req.body;
    const productRef = getDb().collection('products').doc(req.params.id);
    const doc = await productRef.get();
    const product = doc.data();

    let ratings = product.ratings || [];
    const existingIndex = ratings.findIndex(r => r.userId === userId);
    const ratingObj = { userId, stars: parseInt(stars), timestamp: new Date() };

    if (existingIndex >= 0) {
      ratings[existingIndex] = ratingObj;
    } else {
      ratings.push(ratingObj);
    }

    const avgRating = ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length;

    await productRef.update({
      ratings,
      averageRating: parseFloat(avgRating.toFixed(1)),
      ratingsCount: ratings.length
    });

    res.json({ success: true, averageRating: avgRating.toFixed(1), ratingsCount: ratings.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ CATEGORIES ============

app.get('/categories', async (req, res) => {
  try {
    const snapshot = await getDb().collection('categories').get();
    const categories = [];
    snapshot.forEach(doc => categories.push({ id: doc.id, ...doc.data() }));
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const docRef = await getDb().collection('categories').add({ name });
    res.json({ id: docRef.id, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/categories/:id', async (req, res) => {
  try {
    const { name } = req.body;
    await getDb().collection('categories').doc(req.params.id).update({ name });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/categories/:id', async (req, res) => {
  try {
    await getDb().collection('categories').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ORDERS ============

app.get('/orders', async (req, res) => {
  try {
    const snapshot = await getDb().collection('orders').get();
    const orders = [];
    snapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
    // Sort newest first by createdAt
    orders.sort((a, b) => {
      const ta = a.createdAt?._seconds || 0;
      const tb = b.createdAt?._seconds || 0;
      return tb - ta;
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/orders', async (req, res) => {
  try {
    const orderData = {
      ...req.body,
      createdAt: new Date()
    };
    if (!orderData.status) orderData.status = 'قيد الانتظار';
    const docRef = await getDb().collection('orders').add(orderData);

    // Increment sold counter for each ordered product
    const items = orderData.items || [];
    const batch = getDb().batch();
    for (const item of items) {
      if (item.id) {
        const ref = getDb().collection('products').doc(item.id);
        batch.update(ref, {
          sold: require('firebase-admin').firestore.FieldValue.increment(item.qty || 1)
        });
      }
    }
    await batch.commit().catch(() => {}); // don't fail if product missing

    res.json({ id: docRef.id, ...orderData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/orders/:id', async (req, res) => {
  try {
    await getDb().collection('orders').doc(req.params.id).update(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ SETTINGS ============

app.get('/settings', async (req, res) => {
  try {
    const doc = await getDb().collection('settings').doc('main').get();
    if (!doc.exists) return res.json({});
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/settings', async (req, res) => {
  try {
    await getDb().collection('settings').doc('main').set(req.body, { merge: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ ANALYTICS ============

app.get('/analytics', async (req, res) => {
  try {
    const [productsSnap, ordersSnap] = await Promise.all([
      getDb().collection('products').get(),
      getDb().collection('orders').get()
    ]);

    const products = [];
    productsSnap.forEach(doc => products.push({ id: doc.id, ...doc.data() }));

    const orders = [];
    ordersSnap.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));

    const completedOrders = orders.filter(o => o.status === 'delivered');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    const topViewed = [...products].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
    const topRated = [...products].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0)).slice(0, 5);

    res.json({
      totalProducts: products.length,
      totalOrders: orders.length,
      totalRevenue,
      avgOrderValue: orders.length ? (orders.reduce((s, o) => s + (o.total || 0), 0) / orders.length).toFixed(2) : 0,
      topViewed,
      topRated,
      recentOrders: orders.slice(0, 7)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📦 Shop: http://localhost:${PORT}`);
  console.log(`🔐 Admin: http://localhost:${PORT}/admin-login.html`);
});
