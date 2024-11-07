const express = require('express');
const mongoose = require('mongoose');
const { User, Adsenses, Order } = require('../models/models.js');

const orderRoutes = express.Router();

orderRoutes.post('/newOrder', async (req, res) => {
  const { adId, date, duration, bookingTime, userPhone, userName, createdAt } = req.body;

  console.log(adId, date, duration, bookingTime, userPhone, userName, createdAt);

  try {

    // Найдем owner по adId
    const ad = await Adsenses.findOne({ _id: adId });
    if (!ad) {
      return res.status(404).json({ message: 'Объявление не найдено' });
    }

    const owner = await User.findOne({ phone: ad.user })
    if (!owner) {
      return res.status(404).json({ message: 'Владелец объявления не найден' });
    }

    // Находим заказчика (client) по userPhone
    const client = await User.findOne({ phone: userPhone });
    if (!client) {
      return res.status(404).json({ message: 'Клиент не найден' });
    }

    const newOrder = new Order({
      adId,
      date,
      duration,
      bookingTime,
      userPhone,
      userName,
      status: 'waiting for approve',
      createdAt,
      owner: owner._id, // Ссылка на владельца из поля user в Adsenses
      client: client._id  // Ссылка на клиента (пользователя)
    });

    // Сохраняем новый заказ
    await newOrder.save();

    return res.status(200).json({ message: 'Заказ успешно создан', order: newOrder });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Ошибка при создании заказа' });
  }

});

orderRoutes.post('/getOrdersIfUserIsClient', async (req, res) => {
  const { userPhone } = req.body;

  try {
    // Находим пользователя по телефону
    const user = await User.findOne({ phone: userPhone });
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Находим все заказы, где этот пользователь является client
    const orders = await Order.find({
      client: user._id,
      status: 'waiting for approve'
    });

    return res.status(200).json({ message: 'Заказы успешно найдены', orders });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Ошибка при получении заказов' });
  }
});

orderRoutes.post('/getOrdersIfUserIsOwner', async (req, res) => {
  const { userPhone } = req.body;

  try {
    // Находим пользователя по телефону
    const user = await User.findOne({ phone: userPhone });
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Находим все заказы, где этот пользователь является владельцем (owner)
    const orders = await Order.find({
      owner: user._id,
      status: 'waiting for approve'
    });

    return res.status(200).json({ message: 'Заказы успешно найдены', orders });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Ошибка при получении заказов' });
  }
});

orderRoutes.post('/getOrdersInArchive', async (req, res) => {
  const { userPhone } = req.body;

  try {
    // Находим пользователя по телефону
    const user = await User.findOne({ phone: userPhone });
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Находим все заказы, где этот пользователь либо является клиентом, либо заказчиком
    const orders = await Order.find({
      $or: [
        { client: user._id },
        { owner: user._id }
      ],
      status: { $ne: 'waiting for approve' }  // Статус не равен "waiting for approve"
    });

    // Выводим заказы в консоль
    console.log('ordersarchive');

    return res.status(200).json({ message: 'Заказы успешно найдены', orders, success: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Ошибка при получении заказов' });
  }
});

// Подтверждение заказа
orderRoutes.post('/approweOrder', async (req, res) => {
  const { orderId } = req.body;
  console.log('approwe order', req.body)
  try {
    // Находим заказ по его ID и меняем статус на "cancelled"
    const result = await Order.updateOne(
      { _id: orderId },  // Условие поиска по ID заказа
      { $set: { status: 'approwed' } }  // Обновляем только статус
    );

    // Проверяем, был ли заказ найден и обновлен
    if (result.nModified === 0) {
      return res.status(404).json({ message: 'Заказ не найден или уже отменен' });
    }

    return res.status(200).json({ message: 'Заказ успешно отменен', success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Ошибка при отмене заказа' });
  }
});

// Отмена заказа
orderRoutes.post('/dropOrder', async (req, res) => {
  const { orderId } = req.body;
  console.log('drop order', req.body)

  try {
    // Находим заказ по его ID и меняем статус на "cancelled"
    const result = await Order.updateOne(
      { _id: orderId },  // Условие поиска по ID заказа
      { $set: { status: 'cancelled' } }  // Обновляем только статус
    );

    // Проверяем, был ли заказ найден и обновлен
    if (result.nModified === 0) {
      return res.status(404).json({ message: 'Заказ не найден или уже отменен' });
    }

    return res.status(200).json({ message: 'Заказ успешно отменен', success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Ошибка при отмене заказа' });
  }
});

orderRoutes.post('/terminateOrder', async (req, res) => {
  const { orderId } = req.body;
  console.log('delete order');

  try {
    // Находим заказ по его ID и удаляем его
    const result = await Order.deleteOne({ _id: orderId });

    // Проверяем, был ли заказ найден и удален
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Заказ не найден или уже удален' });
    }

    return res.status(200).json({ message: 'Заказ успешно удален', success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Ошибка при удалении заказа' });
  }
});


module.exports = orderRoutes;