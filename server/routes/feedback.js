const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Feedback = require('../models/Feedback');

// POST /api/feedback
router.post('/', auth, async (req, res) => {
    try {
        const { message } = req.body;
        const feedback = new Feedback({
            user_id: req.user.id,
            message
        });
        await feedback.save();
        res.status(201).json({ message: 'Feedback sent successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/feedback (Sysadmin only)
router.get('/', auth, async (req, res) => {
    if (req.user.role !== 'sysadmin') return res.status(403).json({ message: 'Access denied.' });
    try {
        const feedbacks = await Feedback.find().populate('user_id', 'username role').sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/feedback/:id/read (Sysadmin only)
router.put('/:id/read', auth, async (req, res) => {
    if (req.user.role !== 'sysadmin') return res.status(403).json({ message: 'Access denied.' });
    try {
        const feedback = await Feedback.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
        res.json(feedback);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
