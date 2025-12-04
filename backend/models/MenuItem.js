const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  itemNumber: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  name_ne: { type: String },
  name_ja: { type: String },
  price: { type: Number, required: true },
  imageUrl: { type: String },
  category: { type: String, required: true },
  isAvailable: { type: Boolean, default: true },
  prepStation: { type: String, enum: ['kitchen', 'bar', 'pizza', 'grill'], default: 'kitchen' }
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
