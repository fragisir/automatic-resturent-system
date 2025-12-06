const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Order = require('../models/Order');

// Admin Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Hardcoded admin credentials for demo
  if (username === 'admin' && password === 'admin123') {
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Analytics
router.get('/analytics', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ordersToday = await Order.find({ createdAt: { $gte: today } });
    const totalRevenue = ordersToday.reduce((sum, order) => {
      return sum + order.items.reduce((s, i) => s + (i.price * i.quantity), 0);
    }, 0);

    // Most ordered items
    const itemCounts = {};
    ordersToday.forEach(order => {
      order.items.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
      });
    });

    const mostOrdered = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }));

    res.json({
      ordersCount: ordersToday.length,
      totalRevenue,
      mostOrdered
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Generate QR Codes (Permanent Links - No Token)
router.get('/qr-codes', (req, res) => {
  const tables = Array.from({ length: 20 }, (_, i) => i + 1); // Generate for tables 1-20

  const qrCodes = tables.map(table => {
    return {
      table,
      url: `http://localhost:3000/order?table=${table}`
    };
  });

  res.json(qrCodes);
});

module.exports = router;
