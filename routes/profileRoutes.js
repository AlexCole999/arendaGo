const express = require('express');
const mongoose = require('mongoose');
const { User, Adsenses, Order } = require('../models/models.js');

const profileRoutes = express.Router();

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

// Добавление объявления в избранное
profileRoutes.post('/addAdsenseToFavorite', async (req, res) => {
  const { id, phone } = req.body;
  try {
    // Ищем пользователя с указанным номером телефона
    const user = await User.findOne({ phone });

    // Проверяем, существует ли пользователь
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Проверяем, есть ли объявление уже в избранном
    const alreadyFavorite = user.favorites.some(fav => fav.adId === id);

    if (alreadyFavorite) {
      return res.status(200).json({ message: 'Объявление уже добавлено в избранное', favorites: user.favorites });
    }

    // Добавляем объявление, если его нет в избранном
    user.favorites.push({ adId: id });
    await user.save();

    return res.status(200).json({ message: 'Объявление добавлено в избранное', favorites: user.favorites });
  } catch (error) {
    console.error('Ошибка при добавлении в избранное:', error);
    return res.status(500).json({ message: 'Ошибка при добавлении в избранное' });
  }
});

// Удаление объявления из избранного
profileRoutes.post('/removeAdsenseFromFavorite', async (req, res) => {
  const { id, phone } = req.body;
  try {
    // Находим пользователя и удаляем объявление из избранного
    const user = await User.findOneAndUpdate(
      { phone },
      { $pull: { favorites: { adId: id } } }, // Удаляем объявление по id
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    return res.status(200).json({ message: 'Объявление удалено из избранного', favorites: user.favorites });
  } catch (error) {
    console.error('Ошибка при удалении из избранного:', error);
    return res.status(500).json({ message: 'Ошибка при удалении из избранного' });
  }
});

// Запрос избранных объявлений пользователя
profileRoutes.post('/getFavoriteAdsenses', async (req, res) => {
  const { phone } = req.body;
  try {
    const user = await User.findOne({ phone });

    if (!user || !user.favorites.length) {
      return res.status(200).json({ message: 'Избранные объявления не найдены', adsenses: [] });
    }

    // Получаем подробные данные по избранным объявлениям
    const adsenses = await Adsenses.find({ _id: { $in: user.favorites.map(fav => fav.adId) } });

    return res.status(200).json({ adsenses });
  } catch (error) {
    console.error('Ошибка при запросе избранных объявлений:', error);
    return res.status(500).json({ message: 'Ошибка при запросе избранных объявлений' });
  }
});

module.exports = profileRoutes;