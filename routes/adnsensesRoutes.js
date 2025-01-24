const express = require('express');
const mongoose = require('mongoose');
const { User, Adsenses, Order, Service } = require('../models/models.js');

const adsensesRoutes = express.Router();

adsensesRoutes.get('/adsensesMainScreen', async (req, res) => {
  try {
    // Получение пользователей, отсортированных по createdAt, с учетом accType
    const usersSortedByCreatedAt = await User.find({ accType: { $in: ["Мастер", "Коворкинг", "Компания"] } })
      .sort({ createdAt: -1 }) // Сортируем по createdAt по убыванию
      .limit(10); // Ограничиваем результат 10 записями

    // Получение пользователей, отсортированных по рейтингу из testimonials, с учетом accType
    const usersSortedByRating = await User.aggregate([
      { $match: { accType: { $in: ["Мастер", "Коворкинг", "Компания"] } } }, // Фильтруем по accType
      { $unwind: "$testimonials" }, // Разворачиваем массив testimonials
      {
        $group: {
          _id: "$_id",
          accType: { $first: "$accType" },
          avatar: { $first: "$avatar" },
          name: { $first: "$name" },
          phone: { $first: "$phone" },
          title: { $first: "$title" },
          city: { $first: "$city" },
          district: { $first: "$district" },
          address: { $first: "$address" },
          workdays: { $first: "$workdays" },
          workhours: { $first: "$workhours" },
          instagram: { $first: "$instagram" },
          telegram: { $first: "$telegram" },
          whatsapp: { $first: "$whatsapp" },
          description: { $first: "$description" },
          photos: { $first: "$photos" },
          services: { $first: "$services" },
          testimonials: { $push: "$testimonials" },
          createdAt: { $first: "$createdAt" },
          averageRating: { $avg: "$testimonials.rating" } // Рассчитываем среднее значение rating
        }
      },
      { $sort: { averageRating: -1 } }, // Сортируем по среднему значению rating по убыванию
      { $limit: 12 } // Ограничиваем результат 12 записями
    ]);

    res.json({
      usersSortedByCreatedAt,
      usersSortedByRating
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error });
  }
});


adsensesRoutes.get('/adsenses', async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Номер страницы
  const pageSize = 20; // Размер страницы
  console.log(req.query);

  try {
    const serviceQuery = {};

    // Фильтры для подкатегорий и категорий
    if (req.query.subcategory) {
      serviceQuery.category = req.query.subcategory;
    } else if (req.query.category) {
      if (req.query.category === 'Косметология') {
        serviceQuery.category = {
          $in: [
            'Эстетическая косметология',
            'Аппаратная косметология',
            'Инъекционная косметология',
            'Депиляция, шугаринг',
            'Перманентный макияж',
          ],
        };
      } else if (req.query.category === 'Стилисты') {
        serviceQuery.category = {
          $in: ['Стилисты по волосам', 'Визаж', 'Барбершоп'],
        };
      } else {
        serviceQuery.category = req.query.category;
      }
    }

    // Фильтры для ценового диапазона
    if (req.query.priceFrom && req.query.priceTo) {
      serviceQuery.price = {
        $gte: parseInt(req.query.priceFrom, 10), // Преобразуем строку в число
        $lte: parseInt(req.query.priceTo, 10),   // Преобразуем строку в число
      };
    } else if (req.query.priceFrom) {
      serviceQuery.price = {
        $gte: parseInt(req.query.priceFrom, 10), // Преобразуем строку в число
      };
    } else if (req.query.priceTo) {
      serviceQuery.price = {
        $lte: parseInt(req.query.priceTo, 10),   // Преобразуем строку в число
      };
    }

    // Фильтр для валюты
    if (req.query.currency) {
      serviceQuery.fiat = req.query.currency;
    }

    if (req.query.serviceTitle) {
      serviceQuery.title = new RegExp(req.query.serviceTitle, 'i'); // 'i' делает поиск нечувствительным к регистру
    }

    // Получаем список ID владельцев услуг из коллекции Services
    const services = await Service.find(serviceQuery).select('owner -_id');
    const ownerIds = services.map((service) => service.owner);

    const userQuery = {
      _id: { $in: ownerIds }, // Фильтруем пользователей по ID из Services
    };

    if (req.query.accType) {
      userQuery.accType = req.query.accType;
    }

    // Фильтры для пользователей
    if (req.query.city) {
      userQuery.city = req.query.city;
    }

    if (req.query.district) {
      userQuery.district = req.query.district;
    }

    // Фильтрация по названию (закомментировано, так как пока не нужно)
    if (req.query.profileTitle) {
      userQuery.title = new RegExp(req.query.profileTitle, 'i'); // Нечувствительно к регистру
    }

    // Получаем пользователей с фильтрацией
    const users = await User.find(userQuery)
      .select('-password') // Исключаем поле password
      .skip((page - 1) * pageSize) // Пропускаем пользователей для предыдущих страниц
      .limit(pageSize); // Ограничиваем количество пользователей на текущей странице
    console.log(users)
    res.json(users);
  } catch (err) {
    console.error('Ошибка при получении данных:', err);
    res.status(500).json({ message: 'Ошибка при получении данных' });
  }
});


adsensesRoutes.post('/newAdsense', async (req, res) => {

  const { user, accType, title, category, city, district, phone, address, workhours, services, servicesList, imagesList, description, instagram, telegram, whatsapp } = req.body;
  console.log(req.body)
  try {
    const currentDate = new Date();
    const createdAt = currentDate.getTime()
    const newAdsense = new Adsenses({ user, accType, title, category, city, district, phone, address, workhours, services, servicesList, imagesList, description, instagram, telegram, whatsapp, createdAt });
    await newAdsense.save();

    // const result = await Adsenses.find({ _id: adnsenseId }).exec()

    res.status(201).json({ adsenseId: newAdsense.id });
  } catch (err) {
    res.status(400).json({ message: err.message });
    console.log(err)
  }

});



module.exports = adsensesRoutes;