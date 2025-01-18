const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT, // Замените на регион вашего bucket
  accessKeyId: process.env.S3_ACCESS_KEY, // Ваш ключ доступа
  secretAccessKey: process.env.S3_SECRET_KEY, // Ваш секретный ключ
  region: process.env.S3_REGION, // Укажите регион вашего хранилища, если требуется
});

module.exports = s3;
