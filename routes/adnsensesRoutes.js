const express = require('express');
const mongoose = require('mongoose');
const { User, Adsenses, Order } = require('../models/models.js');

const adsensesRoutes = express.Router();

adsensesRoutes.get('/adsensesMainScreen', async (req, res) => {
  try {

    // Получение объявлений, отсортированных по createdAt
    const adsensesSortedByCreatedAt = await Adsenses.find({})
      .sort({ createdAt: -1 }) // Сортируем по createdAt по убыванию
      .limit(10); // Ограничиваем результат 8 объявлениями

    // Получение объявлений, отсортированных по rating из testimonials
    const adsensesSortedByRating = await Adsenses.aggregate([
      { $unwind: "$testimonials" }, // Разворачиваем массив testimonials
      {
        $group: {
          _id: "$_id",
          user: { $first: "$user" },
          title: { $first: "$title" },
          category: { $first: "$category" },
          city: { $first: "$city" },
          district: { $first: "$district" },
          phone: { $first: "$phone" },
          address: { $first: "$address" },
          workhours: { $first: "$workhours" },
          servicesList: { $first: "$servicesList" },
          imagesList: { $first: "$imagesList" },
          description: { $first: "$description" },
          instagram: { $first: "$instagram" }, // Добавляем 
          telegram: { $first: "$telegram" },   // Добавляем telegram
          whatsapp: { $first: "$whatsapp" },     // Добавляем whatsapp
          testimonials: { $push: "$testimonials" },
          createdAt: { $first: "$createdAt" },
          averageRating: { $avg: "$testimonials.rating" } // Рассчитываем среднее значение rating
        }
      },
      { $sort: { averageRating: -1 } }, // Сортируем по среднему значению rating по убыванию
      { $limit: 12 } // Ограничиваем результат 12 объявлениями
    ]);

    console.log(adsensesSortedByRating)

    res.json({
      adsensesSortedByCreatedAt: adsensesSortedByCreatedAt,
      adsensesSortedByRating: adsensesSortedByRating
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error });
  }
});

adsensesRoutes.get('/adsenses', async (req, res) => {

  const page = parseInt(req.query.page) || 1; // Получаем номер страницы из параметра запроса или используем 1 по умолчанию

  const pageSize = 20; // Размер страницы - 20 объявлений

  console.log(req.query)

  try {
    const query = {};

    if (req.query.title) {
      query.title = new RegExp(req.query.title, 'i'); // 'i' делает поиск нечувствительным к регистру
    }

    if (req.query.coworking) {
      if (req.query.coworking == 'true') { query.accType = 'Коворкинг' }
    }

    if (req.query.city) {
      query.city = req.query.city;
    }

    if (req.query.district) {
      query.district = req.query.district;
    }

    if (req.query.subcategory) {
      query.category = req.query.subcategory;
    } else if (req.query.category) {
      if (req.query.category === 'Косметология') {
        query.category = {
          $in: [
            'Эстетическая косметология',
            'Аппаратная косметология',
            'Инъекционная косметология',
            'Депиляция, шугаринг',
            'Перманентный макияж'
          ]
        };
      } else if (req.query.category === 'Стилисты') {
        query.category = {
          $in: [
            'Стилисты по волосам',
            'Визаж',
            'Барбершоп'
          ]
        };
      } else {
        query.category = req.query.category;
      }
    }


    if (req.query.priceFrom && req.query.priceTo) {
      query['servicesList.price'] = {
        $gte: parseInt(req.query.priceFrom),
        $lte: parseInt(req.query.priceTo)
      };
    } else if (req.query.priceFrom) {
      query['servicesList.price'] = {
        $gte: parseInt(req.query.priceFrom)
      };
    } else if (req.query.priceTo) {
      query['servicesList.price'] = {
        $lte: parseInt(req.query.priceTo)
      };
    }

    if (req.query.currency) {
      query['servicesList.fiat'] = req.query.currency;
    }

    const adsenses = await Adsenses.find(query)
      .skip((page - 1) * pageSize) // Пропускаем объявления на предыдущих страницах
      .limit(pageSize); // Ограничиваем количество объявлений на текущей странице

    res.json(adsenses);
  } catch (err) {
    console.error('Ошибка при получении объявлений из базы данных:', err);
    res.status(500).json({ message: 'Ошибка при получении объявлений из базы данных' });
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

adsensesRoutes.post('/getAdsensesById', async (req, res) => {
  const { adIds } = req.body; // Получаем массив adId из тела запроса

  console.log(adIds)

  if (!Array.isArray(adIds) || adIds.length === 0) {
    return res.status(400).json({ message: 'adIds must be a non-empty array' });
  }

  try {
    // Находим объявления по переданным adId
    const ads = await Adsenses.find({ '_id': { $in: adIds } });

    if (ads.length === 0) {
      return res.status(404).json({ message: 'No ads found for the provided adIds' });
    }

    return res.status(200).json(ads);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'An error occurred while fetching ads' });
  }
});

adsensesRoutes.post('/updateAdsense', async (req, res) => {
  const { id, title, category, city, district, phone, address, workhours, servicesList, description } = req.body;

  try {
    const updatedAdsense = await Adsenses.findByIdAndUpdate(
      id,
      {
        title,
        category,
        city,
        district,
        phone,
        address,
        workhours,
        servicesList,
        description
      },
      { new: true } // Опция для возврата обновленного документа
    );

    if (!updatedAdsense) {
      return res.status(404).json({ status: 'error', message: 'Объявление не найдено' });
    }
    res.status(200).json({ status: 'success', data: updatedAdsense });
  } catch (error) {
    console.error('Ошибка при обновлении объявления:', error);
    res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
  }

});

adsensesRoutes.post('/deleteAdsense', async (req, res) => {
  const { id } = req.body;

  // const ad = await Adsenses.findOne({ _id: id });
  // const orders = await Order.find({ adId: id })

  try {
    // Находим все заказы, связанные с этим объявлением
    const ordersToDelete = await Order.deleteMany({ adId: id });

    // Если заказы были найдены и удалены
    if (ordersToDelete.deletedCount > 0) {
      console.log(`${ordersToDelete.deletedCount} заказов удалено`);
    } else {
      console.log('Заказы не найдены');
    }

    // Удаляем само объявление
    const deletedAdsense = await Adsenses.findByIdAndDelete(id);

    if (!deletedAdsense) {
      return res.status(404).json({ message: 'Объявление не найдено' });
    }

    return res.status(200).json({ message: 'Объявление и все связанные с ним заказы успешно удалены' });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Ошибка при удалении объявления и заказов' });
  }
});

adsensesRoutes.post('/newAdsenseTestimonial', async (req, res) => {
  const { adId, rating, text } = req.body;

  try {
    const updatedAdsense = await Adsenses.findOneAndUpdate(
      { _id: adId },
      { $push: { testimonials: { rating, text } } },
      { new: true }
    );

    if (!updatedAdsense) {
      return res.status(404).json({ status: 'error', message: 'Adsense not found' });
    }

    res.status(201).json({ status: 'success', data: updatedAdsense });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

module.exports = adsensesRoutes;