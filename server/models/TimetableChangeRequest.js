const mongoose = require('mongoose');

const timetableChangeRequestSchema = new mongoose.Schema({
    timetable_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Timetable',
        required: true
    },
    requested_by: {   // CR who raised the request
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    faculty_id: {     // Faculty who needs to approve
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Proposed new schedule
    new_day: { type: String, required: true },
    new_start_time: { type: String, required: true },
    new_end_time: { type: String, required: true },
    message: { type: String, trim: true, default: '' },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'conflict'],
        default: 'pending'
    },
    faculty_note: { type: String, default: '' }  // faculty's reply note
}, { timestamps: true });

module.exports = mongoose.model('TimetableChangeRequest', timetableChangeRequestSchema);
