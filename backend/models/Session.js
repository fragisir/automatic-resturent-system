const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  tableNumber: { 
    type: Number, 
    required: true,
    index: true 
  },
  sessionToken: { 
    type: String, 
    required: true,
    unique: true 
  },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'EXPIRED', 'COMPLETED'], 
    default: 'ACTIVE' 
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  expiresAt: { 
    type: Date, 
    required: true,
    index: true 
  }
});

// Index for efficient queries
sessionSchema.index({ tableNumber: 1, status: 1 });
sessionSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Session', sessionSchema);
