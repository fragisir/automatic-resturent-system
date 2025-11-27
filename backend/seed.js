const mongoose = require('mongoose');
const MenuItem = require('./models/MenuItem');
const dotenv = require('dotenv');

dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/easyone')
  .then(() => console.log('MongoDB Connected for Seeding'))
  .catch(err => console.log(err));

const sampleMenu = [
  {
    itemNumber: 101,
    name: "Margherita Pizza",
    price: 500,
    category: "Pizza",
    imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&auto=format&fit=crop&q=60",
    prepStation: "pizza"
  },
  {
    itemNumber: 201,
    name: "Carbonara Pasta",
    price: 600,
    category: "Pasta",
    imageUrl: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=500&auto=format&fit=crop&q=60",
    prepStation: "kitchen"
  },
  {
    itemNumber: 301,
    name: "Grilled Chicken",
    price: 700,
    category: "Grill",
    imageUrl: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=500&auto=format&fit=crop&q=60",
    prepStation: "grill"
  },
  {
    itemNumber: 401,
    name: "Cola",
    price: 200,
    category: "Drink",
    imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60",
    prepStation: "bar"
  },
  {
    itemNumber: 102,
    name: "Pepperoni Pizza",
    price: 550,
    category: "Pizza",
    imageUrl: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&auto=format&fit=crop&q=60",
    prepStation: "pizza"
  },
  {
    itemNumber: 501,
    name: "Caesar Salad",
    price: 400,
    category: "Salad",
    imageUrl: "https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=500&auto=format&fit=crop&q=60",
    prepStation: "kitchen"
  }
];

const seedDB = async () => {
  try {
    await MenuItem.deleteMany({});
    await MenuItem.insertMany(sampleMenu);
    console.log("Database Seeded Successfully!");
  } catch (err) {
    console.log(err);
  } finally {
    mongoose.connection.close();
  }
};

seedDB();
