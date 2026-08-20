const express = require('express');
const authService = require('../services/auth.service');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { login_id, password } = req.body;
  try {
    const tokens = await authService.login(login_id, password);
    res.status(200).json(tokens);
  } catch (err) {
    if (err instanceof authService.AuthError) {
      return res.status(401).json({ message: err.message });
    }
    throw err;
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  try {
    const tokens = await authService.refresh(refreshToken);
    res.status(200).json(tokens);
  } catch (err) {
    if (err instanceof authService.AuthError) {
      return res.status(401).json({ message: err.message });
    }
    throw err;
  }
});

module.exports = router;
