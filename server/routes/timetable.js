const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Timetable = require('../models/Timetable');
const TimetableChangeRequest = require('../models/TimetableChangeRequest');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');

// Sysadmin only middleware
const sysadminOnly = (req, res, next) => {
    if (req.user.role !== 'sysadmin') return res.status(403).json({ message: 'Access denied.' });
    next();
};

// ── GET /api/timetable/venue/:venueId ── (used in BookVenue to show regular schedule)
router.get('/venue/:venueId', auth, async (req, res) => {
    try {
        const timetable = await Timetable.find({ venue_id: req.params.venueId })
            .populate('faculty_id', 'username');
        res.json(timetable);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── GET /api/timetable/all ── Full schedule (used by CR and Admin)
router.get('/all', auth, async (req, res) => {
    try {
        const timetable = await Timetable.find()
            .populate('venue_id', 'name type')
            .populate('faculty_id', 'username')
            .sort({ dayOfWeek: 1, startTime: 1 });
        res.json(timetable);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── GET /api/timetable/my ── Faculty's own assigned classes
router.get('/my', auth, async (req, res) => {
    try {
        const timetable = await Timetable.find({ faculty_id: req.user.id })
            .populate('venue_id', 'name type')
            .sort({ dayOfWeek: 1, startTime: 1 });
        res.json(timetable);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── POST /api/timetable ── Create timetable entry (sysadmin or CR)
router.post('/', auth, async (req, res) => {
    if (!['sysadmin', 'cr'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Access denied. Only sysadmin or CR can add entries.' });
    }
    try {
        const entry = new Timetable(req.body);
        await entry.save();
        await entry.populate('faculty_id', 'username');
        await entry.populate('venue_id', 'name type');
        res.status(201).json(entry);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ── PUT /api/timetable/:id ── Update timings (faculty or sysadmin)
router.put('/:id', auth, async (req, res) => {
    try {
        const { startTime, endTime, dayOfWeek } = req.body;
        const entry = await Timetable.findById(req.params.id);
        if (!entry) return res.status(404).json({ message: 'Timetable entry not found' });

        if (req.user.role !== 'sysadmin' && req.user.id !== entry.faculty_id.toString()) {
            return res.status(403).json({ message: 'Not authorized to change this class timing' });
        }

        if (startTime) entry.startTime = startTime;
        if (endTime) entry.endTime = endTime;
        if (dayOfWeek) entry.dayOfWeek = dayOfWeek;
        await entry.save();
        await entry.populate('faculty_id', 'username');
        await entry.populate('venue_id', 'name type');
        res.json(entry);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── DELETE /api/timetable/:id ── Sysadmin always; Faculty (own class) and CR with conflict check
router.delete('/:id', auth, async (req, res) => {
    try {
        const entry = await Timetable.findById(req.params.id).populate('venue_id', 'name');
        if (!entry) return res.status(404).json({ message: 'Timetable entry not found' });

        const isSysadmin = req.user.role === 'sysadmin';
        const isFacultyOwner = req.user.role === 'faculty' && entry.faculty_id.toString() === req.user.id;
        const isCR = req.user.role === 'cr';

        if (!isSysadmin && !isFacultyOwner && !isCR) {
            return res.status(403).json({ message: 'Not authorized to delete this class.' });
        }

        // Block deletion if any approved or pending booking overlaps this class slot
        const conflicts = await Booking.find({
            venue_id: entry.venue_id._id,
            status: { $in: ['approved', 'pending'] },
            start_time: { $lt: entry.endTime },
            end_time: { $gt: entry.startTime }
        });

        if (conflicts.length > 0 && !isSysadmin) {
            return res.status(409).json({
                message: `Cannot postpone: ${conflicts.length} booking request(s) exist at this time slot. Contact the Sysadmin or ask the admin to cancel those bookings first.`
            });
        }

        await Timetable.findByIdAndDelete(req.params.id);
        res.json({ message: 'Class removed from timetable.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ══════════════════════════════════════════
//  CHANGE REQUESTS  (CR ↔ Faculty Messaging)
// ══════════════════════════════════════════

// ── POST /api/timetable/change-request ── CR submits a change proposal
router.post('/change-request', auth, async (req, res) => {
    if (req.user.role !== 'cr') return res.status(403).json({ message: 'Only CRs can raise change requests.' });
    try {
        const { timetable_id, new_day, new_start_time, new_end_time, message } = req.body;

        const timetable = await Timetable.findById(timetable_id).populate('faculty_id', 'username');
        if (!timetable) return res.status(404).json({ message: 'Timetable entry not found' });

        const changeReq = new TimetableChangeRequest({
            timetable_id,
            requested_by: req.user.id,
            faculty_id: timetable.faculty_id._id,
            new_day,
            new_start_time,
            new_end_time,
            message
        });
        await changeReq.save();

        // Notify faculty
        await new Notification({
            user: timetable.faculty_id._id,
            title: '📋 Timetable Change Request',
            message: `A CR has requested to reschedule ${timetable.courseCode} to ${new_day} ${new_start_time}–${new_end_time}. Message: "${message || 'No message'}"`,
            type: 'info'
        }).save();

        res.status(201).json(changeReq);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// ── GET /api/timetable/change-requests/mine ── CR sees their submitted requests
router.get('/change-requests/mine', auth, async (req, res) => {
    if (req.user.role !== 'cr') return res.status(403).json({ message: 'CRs only.' });
    try {
        const reqs = await TimetableChangeRequest.find({ requested_by: req.user.id })
            .populate({ path: 'timetable_id', populate: { path: 'venue_id', select: 'name' } })
            .populate('faculty_id', 'username')
            .sort({ createdAt: -1 });
        res.json(reqs);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── GET /api/timetable/change-requests/incoming ── Faculty sees pending requests for their classes
router.get('/change-requests/incoming', auth, async (req, res) => {
    if (req.user.role !== 'faculty') return res.status(403).json({ message: 'Faculty only.' });
    try {
        const reqs = await TimetableChangeRequest.find({ faculty_id: req.user.id, status: 'pending' })
            .populate({ path: 'timetable_id', populate: { path: 'venue_id', select: 'name' } })
            .populate('requested_by', 'username')
            .sort({ createdAt: -1 });
        res.json(reqs);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// ── PUT /api/timetable/change-request/:id/respond ── Faculty approves or rejects
router.put('/change-request/:id/respond', auth, async (req, res) => {
    if (req.user.role !== 'faculty') return res.status(403).json({ message: 'Faculty only.' });
    try {
        const { decision, faculty_note } = req.body; // decision: 'approved' | 'rejected'
        const changeReq = await TimetableChangeRequest.findById(req.params.id)
            .populate({ path: 'timetable_id', populate: { path: 'venue_id', select: 'name' } });

        if (!changeReq) return res.status(404).json({ message: 'Change request not found' });
        if (changeReq.faculty_id.toString() !== req.user.id) return res.status(403).json({ message: 'Not your class.' });
        if (changeReq.status !== 'pending') return res.status(400).json({ message: 'Already responded.' });

        if (decision === 'rejected') {
            changeReq.status = 'rejected';
            changeReq.faculty_note = faculty_note || '';
            await changeReq.save();

            // Notify CR
            await new Notification({
                user: changeReq.requested_by,
                title: '❌ Change Request Rejected',
                message: `Faculty rejected your timetable change request. Note: "${faculty_note || 'No note'}"`,
                type: 'error'
            }).save();

            return res.json(changeReq);
        }

        // === APPROVED — check for booking conflicts first ===
        const timetable = changeReq.timetable_id;
        const venueId = timetable.venue_id._id;

        // Find the next occurrence of new_day (approximate—check all approved bookings on that venue)
        const conflicts = await Booking.find({
            venue_id: venueId,
            status: { $in: ['approved', 'pending'] },
            $or: [
                { start_time: { $lt: changeReq.new_end_time }, end_time: { $gt: changeReq.new_start_time } }
            ]
        });

        if (conflicts.length > 0) {
            changeReq.status = 'conflict';
            changeReq.faculty_note = 'Auto-rejected: There is a conflicting approved booking at the proposed time.';
            await changeReq.save();

            await new Notification({
                user: changeReq.requested_by,
                title: '⚠️ Change Request – Time Conflict',
                message: `The proposed time for ${timetable.courseCode} conflicts with an existing approved booking. Request was auto-rejected.`,
                type: 'error'
            }).save();

            return res.status(409).json({ message: 'Conflict: An approved booking exists at the proposed time.', changeReq });
        }

        // No conflict — update the timetable
        await Timetable.findByIdAndUpdate(timetable._id, {
            dayOfWeek: changeReq.new_day,
            startTime: changeReq.new_start_time,
            endTime: changeReq.new_end_time
        });

        changeReq.status = 'approved';
        changeReq.faculty_note = faculty_note || '';
        await changeReq.save();

        // Notify CR of success
        await new Notification({
            user: changeReq.requested_by,
            title: '✅ Change Request Approved',
            message: `Faculty approved your timetable change. ${timetable.courseCode} is now rescheduled to ${changeReq.new_day} ${changeReq.new_start_time}–${changeReq.new_end_time}.`,
            type: 'success'
        }).save();

        res.json(changeReq);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
