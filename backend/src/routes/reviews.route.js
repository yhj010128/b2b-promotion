const express = require('express');
const reviewService = require('../services/review.service');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/:id/reviews', authMiddleware, async (req, res) => {
  try {
    const review = await reviewService.submitReview(req.params.id, req.user.id, req.body);
    res.status(201).json(review);
  } catch (err) {
    if (err instanceof reviewService.ReviewError) {
      return res.status(err.status).json({ message: err.message });
    }
    throw err;
  }
});

module.exports = router;
