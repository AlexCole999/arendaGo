const express = require('express');
const mongoose = require('mongoose');
const { User, Adsenses, Order, Service } = require('../models/models.js');

const profileRoutes = express.Router();

profileRoutes.post('/registrationNewUser', async (req, res) => {
  const { accType, name, phone, password } = req.body;
  try {
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      console.log('-- tried to registrate existing account with:', accType, name, phone, password, new Date().toISOString());
      return res.status(200).json({
        message: 'Такой пользователь уже существует. Нажмите на кнопку "Уже есть аккаунт" под формой регистрации',
      });
    } else {
      const newUser = new User({ accType, phone, name, password });
      await newUser.save();
      console.log('++ Registrated account success with:', accType, name, phone, password, new Date().toISOString());
      return res.status(200).json({ user: newUser, registrationResult: true });
    }
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: 'Ошибка' });
  }
})

profileRoutes.post('/userLogIn', async (req, res) => {
  const { phone, password } = req.body;
  try {
    const user = await User.findOne({ phone });
    if (!user) {
      console.log('-- tried to login not existing account with:', phone, password, new Date().toISOString());
      return res.status(200).json({
        message: 'Пользователь не найден в базе. Нажмите на кнопку "Зарегистрироваться ниже формы"',
      });
    }
    if (user.password === password) {
      console.log('++ logged in user with correct password:', user._id, new Date().toISOString())
      return res.status(200).json({ user: user, logInResult: true });
    } else {
      console.log('-- not logged in user with wrong password:', user._id, new Date().toISOString())
      return res.status(200).json({ message: 'Пароль неверный' });
    }
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: 'Ошибка' });
  }
});


profileRoutes.post('/registrationCheck', async (req, res) => {
  const { _id } = req.body;
  try {
    const user = await User.findOne({ _id });
    if (!user) {
      console.log('-- checked registration with not existing _id:', user._id, new Date().toISOString())
      return res.status(200).json({ checkResult: false });
    }
    if (user) {
      console.log('++ checked registration success with:', user._id, new Date().toISOString())
      return res.status(200).json({ user: user, checkResult: true });
    }
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: 'Ошибка' });
  }
});

profileRoutes.post('/changeUserData', async (req, res) => {
  console.log(req.body);
  try {
    return res.status(200).json(req.body);
  } catch (error) { console.log(error) }
});


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

profileRoutes.post('/createNewService', async (req, res) => {
  const { id, title, category, duration, price, fiat, rules, workers } = req.body;
  try {
    const user = await User.findOne({ _id: id });

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    const newService = new Service({
      owner: user._id,
      title,
      category,
      duration,
      price,
      fiat,
      rules,
      workers
    });

    await newService.save();

    // Добавляем ID нового сервиса в массив services у пользователя
    user.services.push(newService._id);
    await user.save();

    return res.status(201).json({ message: 'Сервис успешно создан', service: newService });
  } catch (error) {
    console.error('Ошибка при создании сервиса:', error);
    return res.status(500).json({ message: 'Ошибка при создании сервиса' });
  }
});

profileRoutes.post('/getServicesById', async (req, res) => {
  console.log(req.body);

  try {
    let ids = req.body.services; // Получаем ids из тела запроса
    if (!ids || (Array.isArray(ids) && ids.length === 0)) {
      return res.status(200).json({ message: 'ID или массив ID обязателен' });
    }

    // Приводим ids к массиву, если это одно значение
    const idArray = Array.isArray(ids) ? ids : [ids];

    // Находим записи в MongoDB
    const services = await Service.find({ _id: { $in: idArray } });
    // Проверяем, если услуги не найдены
    if (services.length === 0) {
      return res.status(200).json({ message: 'Услуги не найдены' });
    }
    // Возвращаем найденные услуги
    return res.status(200).json({ services: services, message: 'Услуги найдены' });
  } catch (error) {
    console.error('Ошибка при получении услуг:', error);
    return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

module.exports = profileRoutes;