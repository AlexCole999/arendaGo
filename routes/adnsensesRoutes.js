const express = require('express');
const mongoose = require('mongoose');

const adsensesRoutes = express.Router();

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
          title: { $title: "$title" },
          category: { $first: "$category" },
          city: { $first: "$city" },
          district: { $first: "$district" },
          phone: { $first: "$phone" },
          address: { $first: "$address" },
          workhours: { $first: "$workhours" },
          servicesList: { $first: "$servicesList" },
          imagesList: { $first: "$imagesList" },
          description: { $first: "$description" },
          testimonials: { $push: "$testimonials" },
          createdAt: { $first: "$createdAt" },
          averageRating: { $avg: "$testimonials.rating" } // Рассчитываем среднее значение rating
        }
      },
      { $sort: { averageRating: -1 } }, // Сортируем по среднему значению rating по убыванию
      { $limit: 12 } // Ограничиваем результат 12 объявлениями
    ]);

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

  const { user, title, category, city, district, phone, address, workhours, services, servicesList, imagesList, description, instagram, telegram, whatsapp } = req.body;
  try {
    const currentDate = new Date();
    const createdAt = currentDate.getTime()
    const newAdsense = new Adsenses({ user, title, category, city, district, phone, address, workhours, services, servicesList, imagesList, description, instagram, telegram, whatsapp, createdAt });
    await newAdsense.save();

    // const result = await Adsenses.find({ _id: adnsenseId }).exec()

    res.status(201).json({ adsenseId: newAdsense.id });
  } catch (err) {
    res.status(400).json({ message: err.message });
    console.log(err)
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

  try {
    const deletedAdsense = await Adsenses.findByIdAndDelete(id);
    if (!deletedAdsense) {
      return res.status(404).json({ status: 'error', message: 'Объявление не найдено' });
    }

    res.status(200).json({ status: 'success', message: 'Объявление успешно удалено' });
  } catch (error) {
    console.error('Ошибка при удалении объявления:', error);
    res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
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