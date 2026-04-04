const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
    venue_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Venue',
        required: true
    },
    dayOfWeek: {
        type: String, // e.g. "Monday", "Tuesday"
        required: true,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    startTime: {
        type: String, // HH:MM
        required: true
    },
    endTime: {
        type: String, // HH:MM
        required: true
    },
    courseCode: {
        type: String,
        required: true,
        trim: true
    },
    faculty_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Timetable', timetableSchema);
