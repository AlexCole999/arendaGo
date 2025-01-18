require('dotenv').config(); // Подключаем переменные окружения из .env
const express = require('express');
const mongoose = require('mongoose');
const s3 = require('../s3config.js');
const AWS = require('aws-sdk');
const multer = require('multer');
const { User, Adsenses, Order, Service } = require('../models/models.js');
const sharp = require('sharp');

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
  const { _id, ...updateData } = req.body; // Получаем _id и остальные данные из тела запроса

  try {
    // Ищем пользователя и обновляем его данные
    const updatedUser = await User.findOneAndUpdate(
      { _id },                // Условие поиска
      { $set: updateData },   // Данные для обновления
      { new: true }           // Возвращает обновленный документ
    );

    if (!updatedUser) {
      console.log('++ no user for update profile data with', req.body);
      return res.status(200).json({ message: 'Пользователь не найден' });
    }

    console.log('++ changed user data with:', updatedUser);

    return res.status(200).json(updatedUser); // Возвращаем обновленные данные
  } catch (error) {
    console.error('Ошибка при обновлении данных пользователя:', error);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
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
profileRoutes.post('/addServiceToFavorite', async (req, res) => {
  const { _id, serviceId } = req.body;
  try {
    console.log(_id, serviceId)
    // return res.status(200).json({ message: 'logged success' });

    // Ищем пользователя с указанным номером телефона
    const user = await User.findOne({ _id: _id });

    // // Проверяем, существует ли пользователь
    if (!user) {
      return res.status(200).json({ message: 'Пользователь не найден' });
    }

    // // Проверяем, есть ли объявление уже в избранном
    const alreadyFavorite = user.favorites.some(fav => fav === serviceId);

    if (alreadyFavorite) {
      return res.status(200).json({ message: 'Объявление уже добавлено в избранное', favorites: user.favorites });
    }

    // Добавляем объявление, если его нет в избранном
    user.favorites.push(serviceId);
    await user.save();

    return res.status(200).json({ message: 'Объявление добавлено в избранное', favorites: user.favorites });
  } catch (error) {
    console.error('Ошибка при добавлении в избранное:', error);
    return res.status(500).json({ message: 'Ошибка при добавлении в избранное' });
  }
});

// Удаление объявления из избранного
profileRoutes.post('/removeServiceFromFavorite', async (req, res) => {
  const { _id, serviceId } = req.body;
  try {
    console.log(_id, serviceId);

    // Находим пользователя с указанным _id
    const user = await User.findOne({ _id: _id });

    // Проверяем, существует ли пользователь
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Проверяем, есть ли объявление в избранном
    const isFavorite = user.favorites.some(fav => fav === serviceId);

    if (!isFavorite) {
      return res.status(200).json({ message: 'Объявление не найдено в избранном', favorites: user.favorites });
    }

    // Удаляем объявление из избранного
    user.favorites = user.favorites.filter(fav => fav !== serviceId);
    await user.save();

    return res.status(200).json({ message: 'Объявление удалено из избранного', favorites: user.favorites });
  } catch (error) {
    console.error('Ошибка при удалении из избранного:', error);
    return res.status(500).json({ message: 'Ошибка при удалении из избранного' });
  }
});

// Запрос избранных объявлений пользователя
profileRoutes.post('/getFavoriteAdsenses', async (req, res) => {
  const { _id } = req.body;
  try {
    const user = await User.findOne({ _id });

    if (!user || !user.favorites.length) {
      return res.status(200).json({ message: 'Избранные объявления не найдены', adsenses: [] });
    }

    // Получаем подробные данные по избранным профилям
    const profiles = await User.find({ _id: { $in: user.favorites } }).select('-password');

    return res.status(200).json({ message: 'Объявления найдены', profiles: profiles });
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
      console.log('-- tried find user while create new service:', id, new Date().toISOString())
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
    console.log('++ created new service with with:', user._id, newService._id, new Date().toISOString())


    // Добавляем ID нового сервиса в массив services у пользователя
    user.services.push(newService._id);
    await user.save();
    console.log('++ appended new service to user profile services list:', user._id, newService._id, new Date().toISOString())

    return res.status(201).json({ message: 'Сервис успешно создан', service: newService });

  } catch (error) {
    console.error('Ошибка при создании сервиса:', error);
    return res.status(500).json({ message: 'Ошибка при создании сервиса' });
  }
});

profileRoutes.post('/getServicesById', async (req, res) => {

  try {
    let ids = req.body.services; // Получаем ids из тела запроса
    if (!ids || (Array.isArray(ids) && ids.length === 0)) {
      console.log('-- cant see id or ids while getServicesById with: ', ids, new Date().toISOString())
      return res.status(200).json({ message: 'ID или массив ID обязателен' });
    }

    // Приводим ids к массиву, если это одно значение
    const idArray = Array.isArray(ids) ? ids : [ids];

    // Находим записи в MongoDB
    const services = await Service.find({ _id: { $in: idArray } });
    // Проверяем, если услуги не найдены
    if (services.length === 0) {
      console.log('-- no results for getServicesById with: ', idArray, new Date().toISOString())
      return res.status(200).json({ message: 'Услуги не найдены' });
    }
    // Возвращаем найденные услуги
    console.log('++ success results for getServicesById with: ', idArray, new Date().toISOString())
    return res.status(200).json({ services: services, message: 'Услуги найдены' });
  } catch (error) {
    console.error('Ошибка при получении услуг:', error);
    return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }

});

profileRoutes.post('/deleteServiceById', async (req, res) => {
  try {
    const { id, userId } = req.body; // Получаем ID услуги и ID пользователя из тела запроса

    // Проверяем, переданы ли необходимые параметры
    if (!id) {
      console.log(`-- Service ID not provided within post request at ${new Date().toISOString()}`);
      return res.status(400).json({ message: 'ID услуги не указан' });
    }

    if (!userId) {
      console.log(`-- User ID not provided within post request at ${new Date().toISOString()}`);
      return res.status(400).json({ message: 'ID пользователя не указан' });
    }

    // Ищем и удаляем документ услуги в MongoDB
    const deletedService = await Service.findByIdAndDelete(id);

    // Если документ услуги не найден
    if (!deletedService) {
      console.log(`-- No service found for deletion with id: ${id} at ${new Date().toISOString()}`);
      return res.status(404).json({ message: 'Услуга не найдена' });
    }

    // Ищем пользователя и удаляем ID услуги из массива services
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pull: { services: id } }, // Удаляем ID услуги из массива services
      { new: true } // Возвращаем обновленный документ пользователя
    );

    // Если пользователь не найден
    if (!updatedUser) {
      console.log(`-- User not found with id: ${userId} at ${new Date().toISOString()}`);
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Выводим информацию об удаленном документе и обновленном пользователе
    console.log(`++ Service deleted with ID: ${deletedService._id} and removed from user ID: ${userId} at ${new Date().toISOString()}`);
    return res.status(200).json({ deletedService, updatedUser, message: 'Услуга удалена и обновлена у пользователя' });
  } catch (error) {
    console.error('Ошибка при удалении услуги:', error);
    return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
  }
});

profileRoutes.post('/newTestimonial', async (req, res) => {
  try {
    const { userId, clientId, avatar, rating, text } = req.body; // Все данные из тела запроса

    // Проверка наличия всех обязательных данных
    if (!userId) {
      console.log('-- Tried to add newTestimonial, no user owner id, with: ', userId, clientId, avatar, rating, text, new Date().toISOString());
      return res.status(200).json({ message: 'Профиля пользователя не существует' });
    }

    // Поиск пользователя и обновление массива testimonials
    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { testimonials: { clientId, avatar, rating, text } } },
      { new: true } // Возвращает обновленный документ
    );

    if (!user) {
      console.log('-- Tried to add newTestimonial, no user client id, with: ', userId, clientId, avatar, rating, text, new Date().toISOString());
      return res.status(200).json({ message: 'Пользователь, отправляющий отзыв, не найден в базе' });
    }

    console.log('++ Added newTestimonial with: ', userId, clientId, avatar, rating, text, new Date().toISOString());
    res.status(200).json({ message: 'success', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Эндпоинт для загрузки изображения
profileRoutes.post('/updateUserAvatar', async (req, res) => {
  try {
    const { avatar, _id, fileName } = req.body;

    if (!avatar) {
      return res.status(400).send('No avatar image provided');
    }

    // Декодируем base64 строку
    const buffer = Buffer.from(avatar, 'base64');

    const buffer80 = await sharp(buffer).webp({ quality: 80 }).toBuffer();
    const buffer55 = await sharp(buffer).webp({ quality: 55 }).toBuffer();
    const buffer25 = await sharp(buffer).webp({ quality: 25 }).toBuffer();

    // const [buffer50, buffer30] = await Promise.all([quality50, quality30]);

    // Параметры для загрузки на S3
    const params = {
      Bucket: 'ВАШ_BUCKET_NAME', // Имя вашего bucket
      Key: `${_id}-${fileName}`, // Имя файла на S3
      Body: buffer80, // Тело запроса с изображением
      ContentType: 'image/jpeg', // Или другой тип изображения в зависимости от вашего файла
      ACL: 'public-read', // Права доступа
    };

    const params50 = {
      Bucket: 'ВАШ_BUCKET_NAME', // Имя вашего bucket
      Key: `${_id}-${fileName}-55`, // Имя файла на S3 для 50% качества
      Body: buffer55, // Сжато изображение с 50% качеством
      ContentType: 'image/jpeg', // Тип изображения
      ACL: 'public-read', // Права доступа
    };

    const params30 = {
      Bucket: 'ВАШ_BUCKET_NAME', // Имя вашего bucket
      Key: `${_id}-${fileName}-25`, // Имя файла на S3 для 30% качества
      Body: buffer25, // Сжато изображение с 30% качеством
      ContentType: 'image/jpeg', // Тип изображения
      ACL: 'public-read', // Права доступа
    };

    const results = await Promise.allSettled([
      s3.upload(params).promise(),
      s3.upload(params50).promise(),
      s3.upload(params30).promise(),
    ]);
    // Возвращаем ссылку на файл после успешной загрузки
    res.status(200).send({ message: 'Изображение успешно загружено', fileUrl: results });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).send('Error uploading image');
  }
});

module.exports = profileRoutes;