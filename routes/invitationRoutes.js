const express = require('express');
const mongoose = require('mongoose');
const { User, Adsenses, Order, Invitation } = require('../models/models.js');

const invitationRoutes = express.Router();

invitationRoutes.post('/users/masters', async (req, res) => {
  try {
    const { text, page } = req.body;
    const limit = 20; // Количество пользователей на странице
    const skip = (page - 1) * limit;

    // Создаем фильтр с возможностью добавления поиска по title сразу
    const filter = {
      accType: 'Мастер',
      ...(text?.length && { title: { $regex: new RegExp(text, 'i') } }) // Если текст есть, добавляем фильтрацию по title
    };

    // Поиск пользователей с учетом фильтра
    const users = await User.find(filter).skip(skip).limit(limit);

    // Возвращаем ответ с пользователями
    res.json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


invitationRoutes.post('/newInvitation', async (req, res) => {
  try {
    const { employerId, workerId } = req.body;
    console.log(employerId, workerId)
    return res.status(201).json({ message: 'success' })
    // Проверяем обязательные поля
    // if (!workerId || !employerId || !orderId) {
    //   return res.status(400).json({ error: 'workerId, employerId, and orderId are required' });
    // }

    // // Создаём приглашение
    // const invitation = new Invitation({
    //   workerId,
    //   employerId,
    //   status: 'pending',
    //   createdAt: Date.now(),
    //   updatedAt: Date.now()
    // });

    // await invitation.save();

    // // Отправляем результат
    // return res.status(201).json({
    //   message: 'Invitation created successfully',
    //   data: invitation
    // });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});




module.exports = invitationRoutes;