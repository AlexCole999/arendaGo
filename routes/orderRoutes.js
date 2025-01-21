const express = require('express');
const mongoose = require('mongoose');
const { User, Adsenses, Order } = require('../models/models.js');

const orderRoutes = express.Router();

orderRoutes.post('/newOrder', async (req, res) => {
  const { serviceId, owner, client, date, duration, time, status, createdAt, worker } = req.body;

  console.log(serviceId, owner, client, date, duration, time, status, createdAt, worker);

  try {
    // Создаем новый заказ
    const newOrder = new Order({
      serviceId,
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
    console.log(`++ Created new order with service:${serviceId},owner:{owner},client${client}`, date, duration, time, status, createdAt, worker, new Date().toISOString());
    console.log('++ New order id:', newOrder._id);
    return res.status(200).json({ message: 'success', order: newOrder });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Ошибка при создании заказа' });
  }

});

orderRoutes.post('/getOrdersByUserId', async (req, res) => {
  const { _id } = req.body;

  try {
    // Найти заказы, где пользователь является владельцем или клиентом
    const orders = await Order.find({
      $or: [
        { owner: _id },
        { client: _id }
      ]
    })
      .sort({ createdAt: -1 }); // Сортируем по полю createdAt, чтобы сначала шли самые новые

    res.json({ success: true, orders });
  } catch (error) {
    console.error("Ошибка получения заказов:", error);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

orderRoutes.post('/approveOrder', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Не указан ID заказа' });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: 'approved' },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Заказ не найден' });
    }

    res.json({ success: true, message: 'Заказ подтверждён', order: updatedOrder });
  } catch (error) {
    console.error('Ошибка подтверждения заказа:', error);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});

orderRoutes.post('/cancelOrder', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Не указан ID заказа' });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: 'canceled' },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Заказ не найден' });
    }

    res.json({ success: true, message: 'Заказ отменён', order: updatedOrder });
  } catch (error) {
    console.error('Ошибка отмены заказа:', error);
    res.status(500).json({ success: false, message: 'Ошибка сервера' });
  }
});



module.exports = orderRoutes;