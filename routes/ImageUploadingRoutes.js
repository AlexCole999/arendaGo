const express = require('express');
const multer = require('multer');
const fs = require('fs');
const ImageUploadingRoutes = express.Router();
const { getCurrentTimeString } = require('../functions/getCurrentTimeString');

ImageUploadingRoutes.post('/upload', (req, res) => {

  try {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) { // Если директории /uploads не существует 
      fs.mkdirSync(uploadDir); // создаем ее
    }

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        try {
          let userData = JSON.parse(req.body.user);
          let userFolderDir = uploadDir + userData.phone;

          if (!fs.existsSync(userFolderDir)) { // если директории пользователя нет в /uploads
            fs.mkdirSync(userFolderDir); // создаем ее
          }

          cb(null, userFolderDir);
        } catch (e) {
          console.error('Ошибка при создании директории пользователя:', e);
          cb(e);
        }
      },
      filename: (req, file, cb) => {


        let userData = JSON.parse(req.body.user); // изымаем данные пользователя из тела запроса
        let userPhone = userData.phone // изымаем телефон из данных пользователя

        try {
          let time = getCurrentTimeString()

          cb(null, time + '-' + userPhone + '.jpg');
        } catch (e) {
          console.error('Ошибка при генерации имени файла:', e);
          cb(e);
        }
      },
    });

    const upload = multer({ storage: storage }).array('images');

    upload(req, res, async (err) => {
      if (err) {
        console.error('Ошибка при загрузке изображения:', err);
        return res.status(500).json({ message: 'Ошибка при загрузке изображения' });
      }
      res.status(200).json({
        message: {
          status: 'Изображения успешно загружены',
        },
        paths: req.files.map(x => x.filename),
      });
      // console.log('Загружено изображение на сервер по адресу: ', req.file.path);
      console.log('Загружено изображение на сервер по адресу: ', req.files.map(x => x.filename));
    });
  } catch (e) {
    console.error('Ошибка при обработке запроса:', e);
    res.status(500).json({ message: 'Ошибка при обработке запроса' });
  }
});

module.exports = ImageUploadingRoutes;
