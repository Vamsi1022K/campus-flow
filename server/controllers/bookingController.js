const Booking = require('../models/Booking');
const Venue = require('../models/Venue');
const Notification = require('../models/Notification');

// ... [createBooking & getBookings omitted for brevity] ...
// We will replace the whole file to ensure clean imports & functions

// @desc    Create a new booking request
// @route   POST /api/bookings
// @access  Private (Faculty, CR, Event Organizer)
exports.createBooking = async (req, res) => {
    try {
        // Frontend sends: venue, date, startTime, endTime, purpose, isWaitlist
        const { venue, date, startTime, endTime, purpose, isWaitlist } = req.body;

        // 1. Basic Validation
        if (!venue || !date || !startTime || !endTime || !purpose) {
            return res.status(400).json({ message: 'Please provide all required fields (venue, date, startTime, endTime, purpose)' });
        }

        // 2. Check if Venue exists
        const venueDoc = await Venue.findById(venue);
        if (!venueDoc) {
            return res.status(404).json({ message: 'Venue not found' });
        }

        // 3. Prevent Double Booking – find overlapping approved/pending bookings
        const overlappingBookings = await Booking.find({
            venue_id: venue,
            date: new Date(date),
            status: { $in: ['approved', 'pending'] },
            $or: [
                { start_time: { $lt: endTime }, end_time: { $gt: startTime } }
            ]
        });

        if (overlappingBookings.length > 0) {
            if (isWaitlist) {
                const waitlistedBooking = new Booking({
                    user_id: req.user.id,
                    venue_id: venue,
                    date,
                    start_time: startTime,
                    end_time: endTime,
                    purpose,
                    status: 'waitlisted'
                });
                await waitlistedBooking.save();
                return res.status(201).json(waitlistedBooking);
            }
            return res.status(409).json({
                message: 'Venue is already booked or pending for this time slot. Would you like to join the waitlist?',
                canWaitlist: true
            });
        }

        // 4. Create Booking
        const newBooking = new Booking({
            user_id: req.user.id,
            venue_id: venue,
            date,
            start_time: startTime,
            end_time: endTime,
            purpose,
            status: 'pending'
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

        const booking = await Booking.findById(req.params.id).populate('venue_id');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        booking.status = status;
        await booking.save();

        // GENERATE NOTIFICATION FOR THE USER
        const venueName = booking.venue_id ? booking.venue_id.name : 'a venue';
        const formattedDate = new Date(booking.date).toLocaleDateString();

        const newNotification = new Notification({
            user: booking.user_id,
            title: `Booking ${status === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
            message: `Your request for ${venueName} on ${formattedDate} from ${booking.start_time} to ${booking.end_time} was ${status}.`,
            type: status === 'approved' ? 'success' : 'error'
        });
        await newNotification.save();

        res.json(booking);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get all approved bookings (for Calendar view)
// @route   GET /api/bookings/approved
// @access  Private
exports.getApprovedBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ status: 'approved' }).populate('venue_id', ['name', 'type']);
        res.json(bookings);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
