require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRouter = require('./routes/auth.route');
const eventsRouter = require('./routes/events.route');
const preferencesRouter = require('./routes/preferences.route');
const reviewsRouter = require('./routes/reviews.route');

if (!process.env.CLIENT_ORIGIN) {
  throw new Error('CLIENT_ORIGIN 환경변수가 필요합니다');
}
if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_ACCESS_SECRET, JWT_REFRESH_SECRET 환경변수가 필요합니다');
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

app.use('/api/auth', authRouter);
app.use('/api/events', eventsRouter);
app.use('/api/events', preferencesRouter);
app.use('/api/events', reviewsRouter);

module.exports = app;
