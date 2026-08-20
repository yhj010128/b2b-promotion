const express = require('express');
const eventService = require('../services/event.service');
const recommendService = require('../services/recommend.service');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', authMiddleware, requireRole('팀장'), async (req, res) => {
  try {
    const event = await eventService.createEvent(req.body);
    res.status(201).json(event);
  } catch (err) {
    if (err instanceof eventService.EventError) {
      return res.status(err.status).json({ message: err.message });
    }
    throw err;
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    res.status(200).json(event);
  } catch (err) {
    if (err instanceof eventService.EventError) {
      return res.status(err.status).json({ message: err.message });
    }
    throw err;
  }
});

router.post('/:id/close', authMiddleware, requireRole('팀장'), async (req, res) => {
  try {
    const event = await eventService.closeEvent(req.params.id);
    res.status(200).json(event);
  } catch (err) {
    if (err instanceof eventService.EventError) {
      return res.status(err.status).json({ message: err.message });
    }
    throw err;
  }
});

router.post('/:id/confirm', authMiddleware, requireRole('팀장'), async (req, res) => {
  try {
    const event = await eventService.confirmEvent(req.params.id, req.body.restaurant_id);
    res.status(200).json(event);
  } catch (err) {
    if (err instanceof eventService.EventError) {
      return res.status(err.status).json({ message: err.message });
    }
    throw err;
  }
});

router.get('/:id/recommendations', authMiddleware, async (req, res) => {
  try {
    const result = await recommendService.getRecommendations(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof eventService.EventError || err instanceof recommendService.RecommendError) {
      return res.status(err.status).json({ message: err.message });
    }
    throw err;
  }
});

module.exports = router;
