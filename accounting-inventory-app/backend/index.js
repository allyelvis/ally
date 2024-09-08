const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize } = require('sequelize');

const app = express();
app.use(bodyParser.json());

const sequelize = new Sequelize('accounting', 'user', 'password', {
  host: 'db',
  dialect: 'postgres',
});

app.get('/', (req, res) => res.send('Accounting and Inventory API'));

app.listen(3000, () => console.log('Server running on port 3000'));
