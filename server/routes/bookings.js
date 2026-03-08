const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const auth = require('../middleware/auth');

// @route   POST api/bookings
// @desc    Create a new booking request
// @access  Private
router.post('/', auth, bookingController.createBooking);

// @route   GET api/bookings
// @desc    Get bookings
// @access  Private
router.get('/', auth, bookingController.getBookings);

// @route   PUT api/bookings/:id/status
// @desc    Update a booking status (Approve/Reject)
// @access  Private (Admins)
router.put('/:id/status', auth, bookingController.updateBookingStatus);

module.exports = router;
