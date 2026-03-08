import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Toast, { useToast } from '../components/Toast';

/* ─────────────── Helper badge ─────────────── */
const StatusBadge = ({ status }) => {
    const styles = {
        approved: 'bg-green-100 text-green-700',
        rejected: 'bg-red-100 text-red-600',
        pending: 'bg-yellow-100 text-yellow-700',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
            {status}
        </span>
    );
};

/* ─────────────── Main Dashboard ─────────────── */
const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const { toast, showToast, closeToast } = useToast();

    const [venues, setVenues] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [busy, setBusy] = useState(true);

    const isAdmin = ['classroom_admin', 'seminar_admin', 'sysadmin'].includes(user?.role);
    const isUser = ['faculty', 'cr', 'event_organizer'].includes(user?.role);

    // Fetch data on mount
    useEffect(() => {
        const load = async () => {
            try {
                const [v, b] = await Promise.all([api.get('/venues'), api.get('/bookings')]);
                setVenues(v.data);
                setBookings(b.data);
            } catch (err) {
                console.error(err);
            } finally {
                setBusy(false);
            }
        };
        if (user) load();
    }, [user]);

    // Admin approve / reject
    const handleStatus = async (id, status) => {
        try {
            await api.put(`/bookings/${id}/status`, { status });
            setBookings(prev => prev.map(b => b._id === id ? { ...b, status } : b));
            showToast(`Booking ${status}!`, status === 'approved' ? 'success' : 'info');
        } catch (err) {
            console.error(err);
            showToast('Failed to update status', 'error');
        }
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    if (busy) return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <p className="text-slate-400 animate-pulse">Loading dashboard...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <Toast toast={toast} onClose={closeToast} />
            {/* ── Navbar ── */}
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold text-blue-600">Campus Flow</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-slate-800">{user?.username}</p>
                        <p className="text-xs text-slate-400 uppercase tracking-wide">{user?.role?.replace('_', ' ')}</p>
                    </div>
                    {user?.role === 'sysadmin' && (
                        <button
                            onClick={() => navigate('/admin')}
                            className="flex items-center gap-1.5 text-sm text-purple-600 font-medium hover:text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg"
                        >
                            ⚙️ Manage System
                        </button>
                    )}
                    <button
                        id="logout-btn"
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 text-sm text-red-500 font-medium hover:text-red-600 transition-colors bg-red-50 px-3 py-1.5 rounded-lg"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

                {/* ═══════════ FACULTY / CR / EVENT VIEW ═══════════ */}
                {isUser && (
                    <div>
                        {/* Welcome Banner */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-8 text-white">
                            <h1 className="text-2xl font-bold">Good day, {user?.username}! 👋</h1>
                            <p className="opacity-80 mt-1">Select a venue below to request a booking.</p>
                        </div>

                        {/* Venues Grid */}
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Available Venues</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
                            {venues.map(venue => (
                                <div key={venue._id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow flex flex-col">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="text-base font-bold text-slate-800">{venue.name}</h3>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${venue.type === 'classroom' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                            {venue.type === 'classroom' ? 'Classroom' : 'Seminar Hall'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-4">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Capacity: {venue.capacity}
                                    </div>
                                    <button
                                        id={`book-${venue._id}`}
                                        onClick={() => navigate(`/book/${venue._id}`)}
                                        className="mt-auto w-full bg-blue-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-blue-700 active:scale-95 transition-all"
                                    >
                                        Request Booking
                                    </button>
                                </div>
                            ))}
                            {venues.length === 0 && (
                                <p className="col-span-3 text-slate-400 py-6 text-center">No venues available.</p>
                            )}
                        </div>

                        {/* My Bookings */}
                        <h2 className="text-xl font-bold text-slate-800 mb-4">My Booking Requests</h2>
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                    <tr>
                                        <th className="px-5 py-3 font-medium">Venue</th>
                                        <th className="px-5 py-3 font-medium">Date & Time</th>
                                        <th className="px-5 py-3 font-medium">Purpose</th>
                                        <th className="px-5 py-3 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {bookings.map(b => (
                                        <tr key={b._id} className="hover:bg-slate-50">
                                            <td className="px-5 py-3 font-medium">{b.venue_id?.name || '—'}</td>
                                            <td className="px-5 py-3">
                                                {new Date(b.date).toLocaleDateString()}<br />
                                                <span className="text-slate-400 text-xs">{b.start_time} – {b.end_time}</span>
                                            </td>
                                            <td className="px-5 py-3">{b.purpose}</td>
                                            <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
                                        </tr>
                                    ))}
                                    {bookings.length === 0 && (
                                        <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">No requests yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ═══════════ ADMIN VIEW ═══════════ */}
                {isAdmin && (
                    <div>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                            {[
                                { label: 'Total Bookings', value: bookings.length, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: 'Pending', value: bookings.filter(b => b.status === 'pending').length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                                { label: 'Approved', value: bookings.filter(b => b.status === 'approved').length, color: 'text-green-600', bg: 'bg-green-50' },
                            ].map(card => (
                                <div key={card.label} className={`${card.bg} rounded-xl px-6 py-5`}>
                                    <p className="text-slate-500 text-sm">{card.label}</p>
                                    <p className={`text-4xl font-bold ${card.color} mt-1`}>{card.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Pending Approvals */}
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Pending Approvals</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                            {bookings.filter(b => b.status === 'pending').map(b => (
                                <div key={b._id} className="bg-white rounded-xl border border-yellow-200 p-6 flex flex-col">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-slate-800">{b.venue_id?.name}</h3>
                                            <p className="text-sm text-slate-500">{new Date(b.date).toLocaleDateString()} · {b.start_time} – {b.end_time}</p>
                                        </div>
                                        <StatusBadge status={b.status} />
                                    </div>
                                    <p className="text-sm text-slate-600 mb-1"><span className="font-medium">By:</span> {b.user_id?.username}</p>
                                    <p className="text-sm text-slate-600 mb-4"><span className="font-medium">Purpose:</span> {b.purpose}</p>
                                    <div className="flex gap-3 mt-auto">
                                        <button
                                            id={`approve-${b._id}`}
                                            onClick={() => handleStatus(b._id, 'approved')}
                                            className="flex-1 bg-green-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-green-700 transition-colors"
                                        >✓ Approve</button>
                                        <button
                                            id={`reject-${b._id}`}
                                            onClick={() => handleStatus(b._id, 'rejected')}
                                            className="flex-1 bg-red-50 text-red-600 text-sm font-semibold py-2 rounded-lg hover:bg-red-100 transition-colors"
                                        >✗ Reject</button>
                                    </div>
                                </div>
                            ))}
                            {bookings.filter(b => b.status === 'pending').length === 0 && (
                                <p className="col-span-2 text-center text-slate-400 py-8 bg-white rounded-xl border border-slate-200">
                                    No pending approvals. ✅
                                </p>
                            )}
                        </div>

                        {/* All Bookings Table */}
                        <h2 className="text-xl font-bold text-slate-800 mb-4">All Booking History</h2>
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                                    <tr>
                                        <th className="px-5 py-3 font-medium">User</th>
                                        <th className="px-5 py-3 font-medium">Venue</th>
                                        <th className="px-5 py-3 font-medium">Date & Time</th>
                                        <th className="px-5 py-3 font-medium">Purpose</th>
                                        <th className="px-5 py-3 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {bookings.map(b => (
                                        <tr key={b._id} className="hover:bg-slate-50">
                                            <td className="px-5 py-3 font-medium">{b.user_id?.username || '—'}</td>
                                            <td className="px-5 py-3">{b.venue_id?.name || '—'}</td>
                                            <td className="px-5 py-3">
                                                {new Date(b.date).toLocaleDateString()}<br />
                                                <span className="text-slate-400 text-xs">{b.start_time} – {b.end_time}</span>
                                            </td>
                                            <td className="px-5 py-3">{b.purpose}</td>
                                            <td className="px-5 py-3"><StatusBadge status={b.status} /></td>
                                        </tr>
                                    ))}
                                    {bookings.length === 0 && (
                                        <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">No bookings found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default Dashboard;
