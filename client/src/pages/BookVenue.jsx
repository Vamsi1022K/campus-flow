import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

const BookVenue = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [venue, setVenue] = useState(null);
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [purpose, setPurpose] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    // Get venue details
    useEffect(() => {
        const fetchVenue = async () => {
            const res = await api.get('/venues');
            const found = res.data.find(v => v._id === id);
            setVenue(found || null);
        };
        fetchVenue().catch(console.error);
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (startTime >= endTime) { setError('End time must be after start time.'); return; }
        setError('');
        setLoading(true);
        try {
            await api.post('/bookings', { venue_id: id, date, start_time: startTime, end_time: endTime, purpose });
            setSuccess(true);
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit booking.');
        } finally {
            setLoading(false);
        }
    };

    if (!venue) return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <p className="text-slate-400 animate-pulse">Loading venue details...</p>
        </div>
    );

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-10 px-4">
            <div className="max-w-2xl mx-auto">

                {/* Back Button */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-700 mb-6 group"
                >
                    <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Dashboard
                </button>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">

                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                        <h1 className="text-2xl font-bold">Request Venue</h1>
                        <p className="opacity-80 mt-1">{venue.name} · {venue.type === 'classroom' ? 'Classroom' : 'Seminar Hall'} · Capacity {venue.capacity}</p>
                    </div>

                    <div className="p-8">
                        {error && (
                            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6 text-sm">
                                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-6 text-sm font-medium">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Booking submitted! Awaiting admin approval. Redirecting...
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                                <input
                                    id="booking-date"
                                    type="date"
                                    value={date}
                                    min={today}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    required
                                />
                            </div>

                            {/* Time Range */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Time</label>
                                    <input
                                        id="booking-start"
                                        type="time"
                                        value={startTime}
                                        onChange={e => setStartTime(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">End Time</label>
                                    <input
                                        id="booking-end"
                                        type="time"
                                        value={endTime}
                                        onChange={e => setEndTime(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Purpose */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Purpose of Booking</label>
                                <textarea
                                    id="booking-purpose"
                                    value={purpose}
                                    onChange={e => setPurpose(e.target.value)}
                                    rows={3}
                                    placeholder="e.g., Extra class for Data Structures"
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    required
                                />
                            </div>

                            <button
                                id="submit-booking-btn"
                                type="submit"
                                disabled={loading || success}
                                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Submitting...</>
                                ) : 'Submit Booking Request'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookVenue;
