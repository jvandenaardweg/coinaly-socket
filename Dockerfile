FROM node:8.11.2

COPY package*.json ./app

RUN npm install

COPY . ./app

EXPOSE 8080

CMD ["npm", "start"]
