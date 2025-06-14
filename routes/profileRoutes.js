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
  const { accType, phone, password } = req.body;
  try {
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      console.log('-- tried to registrate existing account with:', accType, phone, password, new Date().toISOString());
      return res.status(200).json({
        message: 'Такой пользователь уже существует. Нажмите на кнопку "Уже есть аккаунт" под формой регистрации',
      });
    } else {
      const newUser = new User({ accType, phone, password });
      await newUser.save();
      console.log('++ Registrated account success with:', accType, phone, password, new Date().toISOString());
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

profileRoutes.post('/deleteAccount', async (req, res) => {
  const { _id } = req.body;

  try {
    // Проверяем, передан ли ID пользователя
    if (!_id) {
      return res.status(400).json({ message: 'ID пользователя обязателен' });
    }

    // Удаляем пользователя из базы данных
    const deletedUser = await User.findByIdAndDelete(_id);

    // Если пользователь не найден
    if (!deletedUser) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    console.log(`++ Аккаунт пользователя с ID: ${_id} успешно удалён`);
    return res.status(200).json({ message: 'success' });
  } catch (error) {
    console.error('Ошибка при удалении аккаунта:', error);
    return res.status(500).json({ message: 'Ошибка при удалении аккаунта' });
  }
});

profileRoutes.post('/getProfilesByIds', async (req, res) => {
  const { adIds } = req.body; // Получаем массив adId из тела запроса

  console.log('adIds:', adIds)

  if (!Array.isArray(adIds) || adIds.length === 0) {
    return res.status(400).json({ message: 'adIds must be a non-empty array' });
  }

  try {
    // Находим объявления по переданным adId
    const ads = await User.find({ '_id': { $in: adIds } });

    if (ads.length === 0) {
      return res.status(404).json({ message: 'No ads found for the provided adIds' });
    }

    return res.status(200).json(ads);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while fetching ads' });
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


    // Добавляем ID нового сервиса в массив services у пользователя через findOneAndUpdate
    await User.findOneAndUpdate(
      { _id: user._id },
      { $push: { services: newService._id } }
    );
    console.log('++ appended new service to user profile services list:', user._id, newService._id, new Date().toISOString())

    return res.status(201).json({ message: 'success', service: newService });

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
    return res.status(200).json({ services: services, message: 'Услуги найдены', result: 'success' });
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

    console.log(_id)

    const buffer80 = await sharp(buffer).webp({ quality: 80 }).toBuffer();
    const buffer55 = await sharp(buffer).webp({ quality: 55 }).toBuffer();
    const buffer25 = await sharp(buffer).webp({ quality: 25 }).toBuffer();

    // const [buffer50, buffer30] = await Promise.all([quality50, quality30]);
    const bucketName = 'ВАШ_BUCKET_NAME';
    // Параметры для загрузки на S3
    const params = {
      Bucket: bucketName, // Имя вашего bucket
      Key: `${_id}-${fileName}`, // Имя файла на S3
      Body: buffer80, // Тело запроса с изображением
      ContentType: 'image/jpeg', // Или другой тип изображения в зависимости от вашего файла
      ACL: 'public-read', // Права доступа
    };

    const params55 = {
      Bucket: bucketName, // Имя вашего bucket
      Key: `${_id}-${fileName}-55`, // Имя файла на S3 для 50% качества
      Body: buffer55, // Сжато изображение с 50% качеством
      ContentType: 'image/jpeg', // Тип изображения
      ACL: 'public-read', // Права доступа
    };

    const params25 = {
      Bucket: bucketName, // Имя вашего bucket
      Key: `${_id}-${fileName}-25`, // Имя файла на S3 для 30% качества
      Body: buffer25, // Сжато изображение с 30% качеством
      ContentType: 'image/jpeg', // Тип изображения
      ACL: 'public-read', // Права доступа
    };

    const results = await Promise.allSettled([
      s3.upload(params).promise(),
      s3.upload(params55).promise(),
      s3.upload(params25).promise(),
    ]);

    const urls = {
      'quality80': results[0]?.status === 'fulfilled' ? results[0]?.value?.Location : null,
      'quality55': results[1]?.status === 'fulfilled' ? results[1]?.value?.Location : null,
      'quality25': results[2]?.status === 'fulfilled' ? results[2]?.value?.Location : null,
    };

    console.log(urls, _id);

    const user = await User.findByIdAndUpdate(_id, { avatar: urls }, { new: true });

    // Возвращаем ссылку на файл после успешной загрузки

    res.status(200).send({ message: 'success', fileUrl: results, user: user });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).send('Error uploading image');
  }
});

profileRoutes.post('/addUserPhoto', async (req, res) => {
  try {
    const { photo, _id, fileName } = req.body;

    if (!photo) {
      return res.status(400).send('No photo image provided');
    }

    // Декодируем base64 строку
    const buffer = Buffer.from(photo, 'base64');

    const buffer80 = await sharp(buffer).webp({ quality: 80 }).toBuffer();
    const buffer55 = await sharp(buffer).webp({ quality: 55 }).toBuffer();
    const buffer25 = await sharp(buffer).webp({ quality: 25 }).toBuffer();

    const bucketName = 'ВАШ_BUCKET_NAME';

    // Параметры для загрузки на S3
    const params = {
      Bucket: bucketName,
      Key: `${_id}-${fileName}`, // Имя файла на S3
      Body: buffer80,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
    };

    const params55 = {
      Bucket: bucketName,
      Key: `${_id}-${fileName}-55`,
      Body: buffer55,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
    };

    const params25 = {
      Bucket: bucketName,
      Key: `${_id}-${fileName}-25`,
      Body: buffer25,
      ContentType: 'image/jpeg',
      ACL: 'public-read',
    };

    const results = await Promise.allSettled([
      s3.upload(params).promise(),
      s3.upload(params55).promise(),
      s3.upload(params25).promise(),
    ]);

    const urls = {
      quality80: results[0]?.status === 'fulfilled' ? results[0]?.value?.Location : null,
      quality55: results[1]?.status === 'fulfilled' ? results[1]?.value?.Location : null,
      quality25: results[2]?.status === 'fulfilled' ? results[2]?.value?.Location : null,
    };

    console.log(urls, _id);

    // Добавляем ссылки на фотографии в массив photos пользователя
    const user = await User.findByIdAndUpdate(
      _id,
      { $push: { photos: urls } }, // Добавляем объект ссылок в массив photos
      { new: true }
    );

    res.status(200).send({ message: 'success', fileUrls: urls, user });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).send('Error uploading image');
  }
});

profileRoutes.post('/removeUserPhoto', async (req, res) => {
  try {
    const { _id, fileName } = req.body;

    if (!_id || !fileName) {
      return res.status(400).send('User ID and file name are required');
    }

    // Находим пользователя и удаляем объект с фотографиями, у которых есть fileName
    const user = await User.findByIdAndUpdate(
      _id,
      {
        $pull: {
          photos: {
            $or: [
              { quality80: { $regex: fileName } },
              { quality55: { $regex: fileName } },
              { quality25: { $regex: fileName } },
            ],
          },
        },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).send('User not found');
    }
    // Возвращаем успешный ответ с результатом удаления фотографии из MongoDB
    res.status(200).send({ message: 'success', user });
  } catch (error) {
    console.error('Error removing photo:', error);
    res.status(500).send('Error removing photo');
  }
});

profileRoutes.post('/createNewCompany', async (req, res) => {
  const { _id, title, city, country, district, address } = req.body;
  console.log('createNewCompany', req.body);
  try {
    // Создание новой "компании" (в твоём случае это просто новый пользователь)
    const newCompany = new User({
      accType: 'Компания', // если нужно обозначить тип
      title,
      city,
      country,
      district,
      address,
      owner: _id
    });

    await newCompany.save();

    // Добавляем ID компании в поле companies у пользователя-создателя
    await User.findByIdAndUpdate(_id, {
      $push: { companies: newCompany._id.toString() }
    });

    res.status(200).json({
      message: 'Компания успешно создана',
      companyId: newCompany._id
    });

  } catch (error) {
    console.error('Ошибка при создании компании:', error);
    return res.status(500).json({ message: 'Ошибка при создании компании' });
  }
});

module.exports = profileRoutes;