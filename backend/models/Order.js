const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  tableNumber: { type: Number, required: true },
  items: [{
    itemNumber: Number,
    name: String,
    imageUrl: String,
    quantity: Number,
    price: Number
  }],
  status: { type: String, enum: ['NEW', 'COOKING', 'READY', 'PAID'], default: 'NEW' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
