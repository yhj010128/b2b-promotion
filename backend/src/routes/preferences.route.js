const express = require('express');
const preferenceService = require('../services/preference.service');
const eventService = require('../services/event.service');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/:id/preferences', authMiddleware, async (req, res) => {
  try {
    const preference = await preferenceService.submitPreference(req.params.id, req.user.id, req.body);
    res.status(200).json(preference);
  } catch (err) {
    if (err instanceof eventService.EventError || err instanceof preferenceService.PreferenceError) {
      return res.status(err.status).json({ message: err.message });
    }
    throw err;
  }
});

module.exports = router;
