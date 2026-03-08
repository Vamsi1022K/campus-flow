const Booking = require('../models/Booking');
const Venue = require('../models/Venue');

// @desc    Create a new booking request
// @route   POST /api/bookings
// @access  Private (Faculty, CR, Event Organizer)
exports.createBooking = async (req, res) => {
    try {
        const { venue_id, date, start_time, end_time, purpose } = req.body;

        // 1. Basic Validation
        if (!venue_id || !date || !start_time || !end_time || !purpose) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // 2. Check if Venue exists
        const venue = await Venue.findById(venue_id);
        if (!venue) {
            return res.status(404).json({ message: 'Venue not found' });
        }

        // 3. Prevent Double Booking
        // Find any overlapping bookings for the same venue and date that are either approved or pending
        const overlappingBookings = await Booking.find({
            venue_id,
            date: new Date(date),
            status: { $in: ['approved', 'pending'] },
            $or: [
                // New booking starts during an existing booking
                { start_time: { $lt: end_time }, end_time: { $gt: start_time } }
            ]
        });

        if (overlappingBookings.length > 0) {
            return res.status(409).json({ message: 'Venue is already booked or pending for this time slot' });
        }

        // 4. Create Booking
        const newBooking = new Booking({
            user_id: req.user.id,
            venue_id,
            date,
            start_time,
            end_time,
            purpose,
            status: 'pending' // Always starts as pending
        });

        await newBooking.save();
        res.status(201).json(newBooking);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get all bookings (Admin view) or User's bookings
// @route   GET /api/bookings
// @access  Private
exports.getBookings = async (req, res) => {
    try {
        let bookings;

        // Admins see all bookings
        if (['classroom_admin', 'seminar_admin', 'sysadmin'].includes(req.user.role)) {
            bookings = await Booking.find().populate('user_id', ['username', 'role']).populate('venue_id', ['name', 'type']);
        } else {
            // Regular users only see their own bookings
            bookings = await Booking.find({ user_id: req.user.id }).populate('venue_id', ['name', 'type']);
        }

        res.json(bookings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Approve or Reject a booking
// @route   PUT /api/bookings/:id/status
// @access  Private (Admins only)
exports.updateBookingStatus = async (req, res) => {
    try {
        const { status } = req.body;

        // Check role
        if (!['classroom_admin', 'seminar_admin', 'sysadmin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        booking.status = status;
        await booking.save();

        res.json(booking);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
