function getCurrentTimeString() {
  const timestamp = Date.now();
  const date = new Date(timestamp);
  const year = date.getFullYear(); // Год
  const monthIndex = date.getMonth(); // Месяц (номер от 0 до 11)
  const month = monthIndex + 1; // Месяц
  const day = date.getDate(); // День
  const hours = date.getHours(); // Часы
  const minutes = date.getMinutes(); // Минуты
  const seconds = date.getSeconds(); // Секунды
  const milliseconds = date.getMilliseconds(); // Миллисекунды

  // Форматирование миллисекунд, чтобы они были двузначными
  const formattedMilliseconds = milliseconds.toString().padStart(4, '0');

  const time = `${day}-${month}-${year}-${hours}-${minutes}-${seconds}-${formattedMilliseconds}`;
  return time
}

module.exports = {
  getCurrentTimeString,
};