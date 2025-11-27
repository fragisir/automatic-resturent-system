const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Session = require('../models/Session');

// Get all orders
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const jwt = require('jsonwebtoken');

// Helper to generate time-based token (2 min expiration)
const generateToken = (tableNumber, sessionId) => {
  const secret = process.env.JWT_SECRET || 'secret_key_change_this';
  return jwt.sign(
    { table: tableNumber, sessionId: sessionId },
    secret,
    { expiresIn: '2m' }
  );
};

// Helper to verify table token
const verifyToken = (tableNumber, token) => {
  if (!token) return { valid: false, error: 'No token provided' };
  
  try {
    const secret = process.env.JWT_SECRET || 'secret_key_change_this';
    const decoded = jwt.verify(token, secret);
    
    if (decoded.table !== parseInt(tableNumber)) {
      return { valid: false, error: 'Token does not match table number' };
    }
    
    return { valid: true, sessionId: decoded.sessionId };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { valid: false, error: 'Token expired', expired: true };
    }
    return { valid: false, error: 'Invalid token' };
  }
};

// Create session endpoint (called when QR is scanned)
router.post('/create-session', async (req, res) => {
  try {
    const { tableNumber } = req.body;

    if (!tableNumber) {
      return res.status(400).json({ message: 'Table number required' });
    }

    // Comprehensive session cleanup for this table
    // 1. Clean up expired sessions
    await Session.updateMany(
      {
        tableNumber: tableNumber,
        expiresAt: { $lte: new Date() }
      },
      { $set: { status: 'EXPIRED' } }
    );

    // 2. Clean up sessions with PAID orders
    const sessionsWithPaidOrders = await Session.find({
      tableNumber: tableNumber,
      status: 'ACTIVE'
    }).populate('orderId');

    for (const session of sessionsWithPaidOrders) {
      if (session.orderId && session.orderId.status === 'PAID') {
        session.status = 'COMPLETED';
        await session.save();
      }
    }

    // 3. Check if there's any ACTIVE session for this table
    const activeSession = await Session.findOne({
      tableNumber: tableNumber,
      status: 'ACTIVE',
      expiresAt: { $gt: new Date() }
    });

    // If an active session exists, return it (don't create duplicate)
    if (activeSession) {
      return res.json({
        token: activeSession.sessionToken,
        sessionId: activeSession._id,
        expiresAt: activeSession.expiresAt
      });
    }

    // Create new session - generate token FIRST to avoid validation error
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
    
    // Create temporary session object to get the ID
    const tempSession = new Session({
      tableNumber,
      sessionToken: 'temp', // Temporary value
      expiresAt,
      status: 'ACTIVE'
    });

    // Generate JWT token with the session ID
    const token = generateToken(tableNumber, tempSession._id.toString());
    
    // Set the real token
    tempSession.sessionToken = token;
    
    // Now save with valid token
    await tempSession.save();

    res.json({ 
      token,
      sessionId: tempSession._id,
      expiresAt 
    });
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Place a new order
router.post('/', async (req, res) => {
  try {
    const { tableNumber, items, token } = req.body;

    // Verify Token
    const verification = verifyToken(tableNumber, token);
    if (!verification.valid) {
      return res.status(verification.expired ? 401 : 403).json({ 
        message: verification.error,
        expired: verification.expired || false
      });
    }

    // Verify session is still active
    const session = await Session.findById(verification.sessionId);
    if (!session || session.status !== 'ACTIVE' || session.expiresAt < new Date()) {
      return res.status(403).json({ message: 'Session expired or invalid' });
    }

    // Check if table is already occupied (should not happen if session system works)
    const existingOrder = await Order.findOne({
      tableNumber: tableNumber,
      status: { $ne: 'PAID' }
    });

    if (existingOrder) {
      return res.status(400).json({ message: 'Table is already occupied. Please wait for the bill to be paid.' });
    }

    const order = new Order({
      tableNumber,
      items,
      status: 'NEW'
    });

    const newOrder = await order.save();
    
    // Link order to session
    const orderSession = await Session.findById(verification.sessionId);
    if (orderSession) {
      orderSession.orderId = newOrder._id;
      await orderSession.save();
    }
    
    // Emit socket event to kitchen AND all clients
    const io = req.app.get('socketio');
    io.to('kitchen').emit('new_order', newOrder);
    io.emit('new_order', newOrder); // Broadcast to all clients for homepage

    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update order status
router.put('/:id/status', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = req.body.status;
    const updatedOrder = await order.save();

    // If order is marked as PAID, complete the session
    if (req.body.status === 'PAID') {
      await Session.updateMany(
        { orderId: order._id, status: 'ACTIVE' },
        { $set: { status: 'COMPLETED' } }
      );
    }

    // Emit update to everyone (POS, Kitchen)
    const io = req.app.get('socketio');
    io.emit('order_status_updated', updatedOrder);

    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete/Cancel an order (only if status is NEW)
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Only allow canceling NEW orders
    if (order.status !== 'NEW') {
      return res.status(400).json({ message: 'Cannot cancel order that is already being prepared' });
    }

    // Delete the order
    await Order.findByIdAndDelete(req.params.id);

    // Release the session
    await Session.updateMany(
      { orderId: order._id, status: 'ACTIVE' },
      { $set: { status: 'CANCELLED', orderId: null } }
    );

    // Emit update to everyone
    const io = req.app.get('socketio');
    io.emit('order_cancelled', { orderId: order._id, tableNumber: order.tableNumber });

    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Check if table has active order
router.get('/active/:tableNumber', async (req, res) => {
  try {
    const token = req.query.token;
    const verification = verifyToken(req.params.tableNumber, token);
    
    if (!verification.valid) {
      return res.status(verification.expired ? 401 : 403).json({ 
        message: verification.error,
        expired: verification.expired || false
      });
    }
    const activeOrder = await Order.findOne({
      tableNumber: req.params.tableNumber,
      status: { $ne: 'PAID' }
    });
    res.json({ activeOrder });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Refresh token endpoint (extends session)
router.post('/refresh-token', async (req, res) => {
  try {
    const { tableNumber, sessionId } = req.body;
    
    if (!tableNumber || !sessionId) {
      return res.status(400).json({ message: 'Table number and session ID required' });
    }

    // Find and update session
    const session = await Session.findById(sessionId);
    if (!session || session.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Invalid or inactive session' });
    }

    // Extend session by 2 more minutes
    const newExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
    session.expiresAt = newExpiresAt;
    
    // Generate new token
    const newToken = generateToken(tableNumber, sessionId);
    session.sessionToken = newToken;
    await session.save();
    
    res.json({ token: newToken, expiresAt: newExpiresAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ADMIN: Clear all sessions (for debugging)
router.delete('/sessions/clear-all', async (req, res) => {
  try {
    await Session.deleteMany({});
    res.json({ message: 'All sessions cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
