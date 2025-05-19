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

    // Проверяем обязательные поля
    if (!employerId || !workerId) {
      console.log('-- tried to add newInvitation with:', employerId, workerId, new Date().toISOString());
      return res.status(400).json({ error: 'workerId and employerId are required' });
    }

    // Проверяем, существует ли уже приглашение со статусом "waiting"
    const existingInvitation = await Invitation.findOne({
      employerId,
      workerId,
      status: 'waiting'
    });

    if (existingInvitation) {
      console.log('-- duplicate newInvitation detected:', employerId, workerId, new Date().toISOString());
      return res.status(200).json({
        message: 'dupclicate'
      });
    }

    const employer = await User.findById(employerId);
    if (employer && Array.isArray(employer.workers) && employer.workers.includes(workerId)) {
      console.log('-- worker already works for employer:', employerId, workerId, new Date().toISOString());
      return res.status(200).json({
        message: 'already work'
      });
    }

    // Создаём новое приглашение
    const invitation = new Invitation({
      employerId,
      workerId,
      status: 'waiting',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    await invitation.save();

    console.log('++ newInvitation created with:', employerId, workerId, new Date().toISOString());
    // Отправляем результат
    return res.status(200).json({
      message: 'success',
      invitation: invitation
    });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

invitationRoutes.post('/getEmployerInvitations', async (req, res) => {
  try {
    const { employerId } = req.body;

    // Проверяем наличие employerId в запросе
    if (!employerId) {
      return res.status(400).json({ error: 'employerId is required' });
    }

    // Ищем приглашения с заданным employerId и статусом 'approved'
    const invitations = await Invitation.find({ employerId });

    // Отправляем список приглашений
    res.json({ message: 'success', invitations: invitations });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

invitationRoutes.post('/getEmployerApprovedInvitations', async (req, res) => {
  try {
    const { employerId } = req.body;

    // Проверяем наличие employerId в запросе
    if (!employerId) {
      return res.status(400).json({ error: 'employerId is required' });
    }

    // Ищем приглашения с заданным employerId и статусом 'approved'
    const invitations = await Invitation.find({ employerId, status: 'approved' });

    // Отправляем список приглашений
    res.json({ message: 'success', invitations: invitations });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

invitationRoutes.post('/getWorkerUnansweredInvitations', async (req, res) => {
  try {
    const { workerId } = req.body;

    // Проверяем наличие workerId в запросе
    if (!workerId) {
      return res.status(400).json({ error: 'workerId is required' });
    }

    // Ищем приглашения с заданным workerId и статусом waiting
    const invitations = await Invitation.find({ workerId, status: 'waiting' });

    // Отправляем список приглашений
    res.json({ message: 'success', invitations: invitations });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

invitationRoutes.post('/getWorkerAnsweredInvitations', async (req, res) => {
  try {
    const { workerId } = req.body;

    // Проверяем наличие workerId в запросе
    if (!workerId) {
      return res.status(400).json({ error: 'workerId is required' });
    }

    // Ищем приглашения с заданным workerId и статусом waiting
    const invitations = await Invitation.find({ workerId, status: { $ne: 'waiting' } });

    // Отправляем список приглашений
    res.json({ message: 'success', invitations: invitations });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Изменение статуса на approved
invitationRoutes.post('/approveInvitation', async (req, res) => {
  try {
    const { invitationId } = req.body;

    // Проверяем наличие invitationId
    if (!invitationId) {
      return res.status(400).json({ error: 'invitationId is required' });
    }

    // Находим приглашение и получаем workerId и employerId
    const invitation = await Invitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const { workerId, employerId } = invitation;

    // Обновляем статус приглашения на approved через findByIdAndUpdate
    await Invitation.findByIdAndUpdate(
      invitationId,
      { status: 'approved', updatedAt: Date.now() }
    );

    // // Находим работодателя и работника
    const employer = await User.findById(employerId);
    const worker = await User.findById(workerId);
    console.log(worker, employer)

    if (!employer || !worker) {
      return res.status(404).json({ error: 'Employer or worker not found' });
    }

    // // Добавляем workerId в workers работодателя, если его там нет
    await User.findOneAndUpdate(
      { _id: employerId, workers: { $ne: workerId } },
      { $push: { workers: workerId } }
    );

    // Заменяем workAt у работника на employerId
    await User.findOneAndUpdate(
      { _id: workerId },
      { workAt: employerId }
    );

    res.json({ message: 'success', invitation });
  } catch (error) {
    console.error('Error approving invitation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Изменение статуса на canceled
invitationRoutes.post('/cancelInvitation', async (req, res) => {
  try {
    const { invitationId } = req.body;

    // Проверяем наличие invitationId
    if (!invitationId) {
      return res.status(400).json({ error: 'invitationId is required' });
    }

    // Обновляем статус на canceled
    const updatedInvitation = await Invitation.findByIdAndUpdate(
      invitationId,
      { status: 'canceled', updatedAt: Date.now() },
      { new: true } // Возвращаем обновленный документ
    );

    if (!updatedInvitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    res.json({ message: 'success', invitation: updatedInvitation });
  } catch (error) {
    console.error('Error canceling invitation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = invitationRoutes;