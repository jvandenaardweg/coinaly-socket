FROM node:8.11.1

WORKDIR /opt/app

COPY . /opt/app

RUN npm install -g forever
RUN npm install

EXPOSE 8000

CMD ["npm", "start"]
