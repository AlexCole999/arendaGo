const express = require('express');
const mongoose = require('mongoose');

const profileRoutes = express.Router();

let User;
try {
  User = mongoose.model('Users');
} catch (e) {
  User = mongoose.model('Users', {
    accType: String,
    name: String,
    phone: String,
    password: String,
    orders: [
      {
        adId: String,
        date: Date,
        duration: String,
        bookingTime: String,
        userPhone: String,
        userName: String,
        status: {
          type: String,
          default: 'waiting for approve'
        },
        createdAt: Number
      }
    ]
  });
}

let Adsenses;
try {
  Adsenses = mongoose.model('Adsenses');
} catch (e) {
  Adsenses = mongoose.model('Adsenses', {
    user: String,
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
    createdAt: Number,
    orders: [
      {
        adId: String,
        date: Date,
        duration: String,
        bookingTime: String,
        userPhone: String,
        userName: String,
        status: {
          type: String,
          default: 'waiting for approve'
        },
        createdAt: Number
      }
    ]
  });
}

profileRoutes.post('/getUserAdsenses', async (req, res) => {
  let user = req?.body?.user ? JSON.parse(req.body.user).phone : 'none'
  try {
    const adsenses = await Adsenses.find({ user: user });
    if (adsenses.length > 0) {
      console.log("Найдены объявления", adsenses.length);
      res.status(200).json({ adsenses });
    } else {
      console.log("Объявления пользователя с номером телефона", user, "не найдены.");
      res.status(200).json({ adsenses: [] });
    }
  } catch (err) {
    console.error("Ошибка при поиске объявлений:", err);
    res.status(500).json({ message: "Ошибка при поиске объявлений" });
  }
})

profileRoutes.post('/registrationCheck', async (req, res) => {
  const { name, phone, password } = req.body;
  try {
    const user = await User.findOne({ phone });
    if (!user) {
      console.log('Пользователь не найден');
      return res.status(200).json({
        message: `Пользователя нет в базе. Хотите зарегистрироваться?`,
        registrationConfirmation: true
      });
    }
    console.log('Найден пользователь:', user);
    if (user.password == password) { return res.status(200).json({ user: user, correctPassword: true }); }
    if (user.password !== password) { return res.status(200).json({ user: user, correctPassword: false }); }
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: 'Ошибка' });
  }
});

profileRoutes.post('/registrationNewUser', async (req, res) => {
  const { accType, name, phone, password } = req.body;
  try {
    const newUser = new User({ accType, phone, name, password });
    await newUser.save();
    return res.status(200).json({ user: newUser, registrationResult: 'success' });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: 'Ошибка' });
  }
})

profileRoutes.post('/newOrder', async (req, res) => {
  const { adId, date, duration, bookingTime, userPhone, userName, createdAt } = req.body;

  console.log(adId, date, duration, bookingTime, userPhone, userName, createdAt);

  try {
    // Создаем новый заказ
    const newOrder = {
      _id: new mongoose.Types.ObjectId(),  // Генерируем уникальный идентификатор
      adId,
      date,
      duration,
      bookingTime,
      userPhone,
      userName,
      status: 'Ожидает подтверждения',
      createdAt
    };

    // Обновляем документ в коллекции Adsenses
    const updatedAdsense = await Adsenses.findOneAndUpdate(
      { _id: adId },
      { $push: { orders: newOrder } },
      { new: true }  // Возвращает обновленный документ
    );

    if (!updatedAdsense) {
      return res.status(404).json({ message: 'Объявление не найдено' });
    }

    // Обновляем документ в коллекции Users
    const user = await User.findOneAndUpdate(
      { phone: userPhone },
      { $push: { orders: newOrder } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    return res.status(200).json({ message: 'Заказ успешно создан', order: newOrder });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Ошибка при создании заказа' });
  }
});


profileRoutes.post('/getUserAdsensesWithHisOrders', async (req, res) => {
  let user = req?.body?.user ? JSON.parse(req.body.user).phone : 'none'

  // const adsenses = await Adsenses.find({ 'orders.userPhone': user });
  const adsenses = await Adsenses.find({ user: { $ne: user }, 'orders.userPhone': user });

  res.status(200).json({ adsenses });
})

profileRoutes.post('/acceptOrder', async (req, res) => {
  const { orderId } = req.body;

  try {
    // Находим и обновляем заказ в коллекции Adsenses
    const updatedOrder = await Adsenses.findOneAndUpdate(
      { 'orders._id': orderId },
      { $set: { 'orders.$.status': 'Подтверждено' } },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Заказ не найден' });
    }

    // Находим и обновляем заказ в коллекции Users
    const updatedUser = await User.findOneAndUpdate(
      { 'orders._id': orderId },
      { $set: { 'orders.$.status': 'Подтверждено' } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    return res.status(200).json({ message: 'Статус заказа успешно изменен', order: updatedOrder });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Ошибка при изменении статуса заказа' });
  }
});

profileRoutes.post('/deleteOrder', async (req, res) => {
  const { id } = req.body;

  try {
    // Удаление заказа из коллекции Adsenses
    const updatedAdsense = await Adsenses.findOneAndUpdate(
      { 'orders._id': id },
      { $pull: { orders: { _id: id } } },
      { new: true }
    );

    //Удаление заказа из коллекции Users
    const updatedUser = await User.findOneAndUpdate(
      { 'orders._id': id },
      { $pull: { orders: { _id: id } } },
      { new: true }
    );

    console.log(updatedAdsense)

    if (!updatedAdsense) {
      return res.status(404).json({ message: 'Заказ не найден' });
    }

    return res.status(200).json({ message: 'Заказ успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении заказа:', error);
    return res.status(500).json({ message: 'Ошибка при удалении заказа' });
  }
});


module.exports = profileRoutes;