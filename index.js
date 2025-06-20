const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

const adsensesRoutes = require('./routes/adnsensesRoutes');
const ImageUploadingRoutes = require('./routes/ImageUploadingRoutes');
const profileRoutes = require('./routes/profileRoutes');
const orderRoutes = require('./routes/orderRoutes.js');
const invitationRoutes = require('./routes/invitationRoutes.js');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

app.use(adsensesRoutes);
app.use(ImageUploadingRoutes);
app.use(profileRoutes);
app.use(orderRoutes);
app.use(invitationRoutes);

app.use(express.static('uploads'));//директория с отдачей файлов
app.use(express.static('uploadsAdmin'));//директория с отдачей файлов

let host = 'mongodb+srv://leonidsamograew:f0w46Xij58g68FkE@cluster0.gnuizze.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
// let localhost = 'mongodb://localhost:27017/arendaGo'
// Подключение к MongoDB
mongoose.connect(host)
  .then(() => {
    console.log('Подключено к MongoDB на localhost');
  }).catch((err) => {
    console.error('Ошибка подключения к MongoDB:', err);
  });

app.listen(3000, () => {
  console.log('Сервер запущен на порту 3000');
});