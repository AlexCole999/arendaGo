// models.js
const mongoose = require('mongoose');

// Модель пользователя
let User;
try {
  User = mongoose.model('Users');
} catch (e) {
  User = mongoose.model('Users', new mongoose.Schema({
    accType: { type: String, default: '' },
    avatar: { type: String, default: '' },
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    title: { type: String, default: '' },
    city: { type: String, default: '' },
    district: { type: String, default: '' },
    address: { type: String, default: '' },
    workdays: { type: String, default: '' },
    workhours: { type: String, default: '' },
    instagram: { type: String, default: '' },
    telegram: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    description: { type: String, default: '' },
    photos: { type: [String], default: [] },
    password: { type: String, default: '' },
    email: { type: String, default: '' },
    favorites: { type: [{ adId: String }], default: [] }
  }));
}

// Модель объявления
let Adsenses;
try {
  Adsenses = mongoose.model('Adsenses');
} catch (e) {
  Adsenses = mongoose.model('Adsenses', new mongoose.Schema({
    user: String,
    accType: String,
    title: String,
    category: String,
    city: String,
    district: String,
    phone: String,
    address: String,
    workhours: String,
    servicesList: [
      {
        hours: String,
        price: Number,
        fiat: String
      }
    ],
    imagesList: [String],
    description: String,
    instagram: String,
    telegram: String,
    whatsapp: String,
    testimonials: [
      {
        text: String,
        rating: Number
      }
    ],
    createdAt: Number
  }));
}

// Модель заказа
let Order;
try {
  Order = mongoose.model('Order');
} catch (e) {
  Order = mongoose.model('Order', new mongoose.Schema({
    adId: String,
    date: String,
    duration: String,
    bookingTime: String,
    userPhone: String,
    userName: String,
    status: { type: String, default: 'waiting for approve' },
    createdAt: Number,
    owner: String,
    client: String
  }));
}

module.exports = { User, Adsenses, Order };
