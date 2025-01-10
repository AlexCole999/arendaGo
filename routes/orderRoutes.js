const express = require('express');
const mongoose = require('mongoose');
const { User, Adsenses, Order } = require('../models/models.js');

const orderRoutes = express.Router();

orderRoutes.post('/newOrder', async (req, res) => {
  const { service, owner, client, date, duration, time, status, createdAt, worker } = req.body;

  console.log(service, owner, client, date, duration, time, status, createdAt, worker);

  try {
    // Создаем новый заказ
    const newOrder = new Order({
      service,
      owner,
      client,
      date,
      duration,
      time,
      status,
      createdAt,
      worker
    });

    // Сохраняем заказ в базе данных
    await newOrder.save();

    // Возвращаем ID нового заказа
    console.log(`++ Created new order with service:${service},owner:{owner},client${client}`, date, duration, time, status, createdAt, worker, new Date().toISOString());
    console.log('++ New order id:', newOrder._id);
    return res.status(200).json({ message: 'success', order: newOrder });

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