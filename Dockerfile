FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Только прод зависимости — это сильно ужимает
RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
