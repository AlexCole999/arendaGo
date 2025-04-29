// models.js
const mongoose = require('mongoose');

// Модель пользователя
let User;
try {
  User = mongoose.model('Users');
} catch (e) {
  User = mongoose.model('Users', new mongoose.Schema({
    accType: { type: String, default: '' },
    avatar: {
      type: Map,
      of: String,
      default: {}
    },
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    title: { type: String, default: '' },
    country: { type: String, default: 'Узбекистан' },
    city: { type: String, default: '' },
    district: { type: String, default: '' },
    address: { type: String, default: '' },
    workdays: { type: String, default: '' },
    workhours: { type: String, default: '' },
    instagram: { type: String, default: '' },
    telegram: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    description: { type: String, default: '' },
    photos: [{
      type: Map,
      of: String,
      default: {}
    }],
    password: { type: String, default: '' },
    email: { type: String, default: '' },
    favorites: { type: [String], default: [] },
    workers: { type: [String], default: [] },
    workAt: { type: [String], default: [] },
    services: { type: [String], default: [] },
    testimonials: {
      type: [{
        clientId: { type: String, default: '' },
        avatar: { type: String, default: '' },
        rating: { type: Number, default: 0 },
        text: { type: String, default: '' }
      }],
      default: []
    }
  }));
}

let Service;
try {
  Service = mongoose.model('Services');
} catch (e) {
  Service = mongoose.model('Services', new mongoose.Schema({
    owner: { type: String, default: '' },
    title: { type: String, default: '' },
    category: { type: String, default: '' },
    duration: { type: String, default: '' },
    price: { type: Number, default: 0 },
    fiat: { type: String, default: '' },
    rules: { type: String, default: '' },
    workers: { type: [String], default: [] },
    testimonials: {
      type: [new mongoose.Schema({ // Вложенная схема
        profileId: String,
        clientId: String,
        rating: Number,
        text: String
      })], default: []
    }
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
    serviceId: String,
    manyServices: [String],
    owner: String,
    client: String,
    date: String,
    duration: String,
    time: String,
    status: { type: String, default: 'waiting' },
    createdAt: Number,
    worker: String
  }));
}

let Invitation;
try {
  Invitation = mongoose.model('Invitation');
} catch (e) {
  Invitation = mongoose.model('Invitation', new mongoose.Schema({
    workerId: { type: String, required: true }, // ID работника
    employerId: { type: String, required: true }, // ID работодателя
    status: { type: String, default: 'waiting' }, // waiting, approved, canceled
    createdAt: { type: Number, default: Date.now }, // Дата создания
    updatedAt: { type: Number, default: Date.now } // Дата обновления
  }));
}


module.exports = { User, Adsenses, Service, Order, Invitation };
