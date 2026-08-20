require('dotenv').config();

const express = require('express');
const cors = require('cors');

if (!process.env.CLIENT_ORIGIN) {
  throw new Error('CLIENT_ORIGIN 환경변수가 필요합니다');
}

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

module.exports = app;
