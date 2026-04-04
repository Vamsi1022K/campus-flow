import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import Toast, { useToast } from '../components/Toast';
import CalendarView from '../components/CalendarView';
import AnalyticsChart from '../components/AnalyticsChart';

/* ── Status badge ── */
const StatusBadge = ({ status }) => {
    const map = {
        pending: 'badge-pending',
        approved: 'badge-approved',
        rejected: 'badge-rejected',
        cancelled: 'badge-rejected',
        waitlisted: 'badge-waitlist',
    };
    return (
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${map[status] || 'badge-pending'}`}>
            {status?.charAt(0).toUpperCase() + status?.slice(1)}
        </span>
    );
};

/* ── Main Dashboard ── */
const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const { isDark, toggle } = useTheme();
    const { toast, showToast, closeToast } = useToast();

    const [venues, setVenues] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [publicBookings, setPublicBookings] = useState([]); 
    const [notifications, setNotifications] = useState([]);
    const [myTimetable, setMyTimetable] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [busy, setBusy] = useState(true);

    const [viewMode, setViewMode] = useState('list'); 
    const notifRef = useRef(null);

    // Feedback state
    const [feedMsg, setFeedMsg] = useState('');
    const [feedLoading, setFeedLoading] = useState(false);

    // Timetable edit state (Faculty)
    const [editModeId, setEditModeId] = useState(null);
    const [editStart, setEditStart] = useState('');
    const [editEnd, setEditEnd] = useState('');

    // CR: add timetable entry form
    const [crAddForm, setCrAddForm] = useState({ venue_id: '', dayOfWeek: 'Monday', startTime: '', endTime: '', courseCode: '', faculty_id: '' });
    const [crAddLoading, setCrAddLoading] = useState(false);
    const [allFaculty, setAllFaculty] = useState([]);

    // CR: submit change request
    const [changeReqForm, setChangeReqForm] = useState({ timetable_id: '', new_day: 'Monday', new_start_time: '', new_end_time: '', message: '' });
    const [changeReqLoading, setChangeReqLoading] = useState(false);
    const [myChangeRequests, setMyChangeRequests] = useState([]);
    const [showChangeReqForm, setShowChangeReqForm] = useState(null); // timetable_id being requested

    // Faculty: incoming change requests
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [respondNote, setRespondNote] = useState({});

    // Close notifications on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };
        if (showNotifications) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showNotifications]);

    // Search & filter state
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterCap, setFilterCap] = useState('');

    const isAdmin = ['classroom_admin', 'seminar_admin', 'sysadmin'].includes(user?.role);
    const isUser = ['faculty', 'cr', 'event_organizer'].includes(user?.role);

    useEffect(() => {
        const load = async () => {
            try {
                const promises = [
                    api.get('/venues'),
                    api.get('/bookings'),
                    api.get('/notifications'),
                    api.get('/bookings/approved'),
                    isUser
                        ? api.get(user?.role === 'cr' ? '/timetable/all' : '/timetable/my')
                        : Promise.resolve({ data: [] })
                ];
                // CR: also load faculty list + their change requests
                if (user?.role === 'cr') {
                    promises.push(api.get('/users/faculty'));
                    promises.push(api.get('/timetable/change-requests/mine'));
                }
                // Faculty: load incoming change requests
                if (user?.role === 'faculty') {
                    promises.push(api.get('/timetable/change-requests/incoming'));
                }

                const results = await Promise.all(promises);
                setVenues(results[0].data);
                setBookings(results[1].data);
                setNotifications(results[2].data);
                setPublicBookings(results[3].data);
                setMyTimetable(results[4].data);

                if (user?.role === 'cr') {
                    setAllFaculty(results[5].data);
                    setMyChangeRequests(results[6].data);
                }
                if (user?.role === 'faculty') {
                    setIncomingRequests(results[5].data);
                }
            } catch (err) {
                showToast('Failed to load data', 'error');
            } finally {
                setBusy(false);
            }
        };
        if (user) load();
    }, [user, isUser]);

    const handleStatus = async (id, status) => {
        try {
            await api.put(`/bookings/${id}/status`, { status });
            setBookings(prev => prev.map(b => b._id === id ? { ...b, status } : b));
            showToast(`Booking ${status}! ✓`, status === 'approved' ? 'success' : 'info');
        } catch {
            showToast('Failed to update status', 'error');
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Cancel this booking request?')) return;
        try {
            await api.patch(`/bookings/${id}/cancel`);
            setBookings(prev => prev.map(b => b._id === id ? { ...b, status: 'cancelled' } : b));
            showToast('Booking cancelled', 'info');
        } catch (err) {
            showToast(err.response?.data?.message || 'Cannot cancel', 'error');
        }
    };

    const submitFeedback = async (e) => {
        e.preventDefault();
        setFeedLoading(true);
        try {
            await api.post('/feedback', { message: feedMsg });
            showToast('Feedback sent to System Admin!', 'success');
            setFeedMsg('');
        } catch (err) {
            showToast('Failed to send feedback', 'error');
        } finally {
            setFeedLoading(false);
        }
    };

    const saveTimetableEdits = async (timetableId) => {
        try {
            const res = await api.put(`/timetable/${timetableId}`, { startTime: editStart, endTime: editEnd });
            setMyTimetable(prev => prev.map(t => t._id === timetableId ? res.data : t));
            setEditModeId(null);
            showToast('Timetable updated', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to update timing', 'error');
        }
    };

    // CR: Add a new timetable entry
    const handleCrAddTimetable = async (e) => {
        e.preventDefault();
        setCrAddLoading(true);
        try {
            const res = await api.post('/timetable', crAddForm);
            setMyTimetable(prev => [...prev, res.data]);
            setCrAddForm({ venue_id: '', dayOfWeek: 'Monday', startTime: '', endTime: '', courseCode: '', faculty_id: '' });
            showToast(`Class "${res.data.courseCode}" added to schedule! ✓`, 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to add class', 'error');
        } finally {
            setCrAddLoading(false);
        }
    };

    // CR or Faculty: Delete/postpone a class (blocked if bookings exist)
    const deleteTimetableEntry = async (t) => {
        if (!window.confirm(`Mark "${t.courseCode}" as postponed and remove from schedule?`)) return;
        try {
            await api.delete(`/timetable/${t._id}`);
            setMyTimetable(prev => prev.filter(x => x._id !== t._id));
            showToast(`"${t.courseCode}" removed from timetable.`, 'info');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to remove class', 'error');
        }
    };

    // CR: Submit a change request for a timetable entry
    const handleSubmitChangeRequest = async (e) => {
        e.preventDefault();
        setChangeReqLoading(true);
        try {
            const res = await api.post('/timetable/change-request', changeReqForm);
            setMyChangeRequests(prev => [res.data, ...prev]);
            setShowChangeReqForm(null);
            setChangeReqForm({ timetable_id: '', new_day: 'Monday', new_start_time: '', new_end_time: '', message: '' });
            showToast('Change request sent to faculty! ✓', 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to send request', 'error');
        } finally {
            setChangeReqLoading(false);
        }
    };

    // Faculty: respond to a change request
    const handleRespondToRequest = async (reqId, decision) => {
        try {
            const res = await api.put(`/timetable/change-request/${reqId}/respond`, {
                decision,
                faculty_note: respondNote[reqId] || ''
            });
            setIncomingRequests(prev => prev.filter(r => r._id !== reqId));
            if (decision === 'approved') {
                // Refresh timetable to show the updated timings
                const updated = await api.get('/timetable/my');
                setMyTimetable(updated.data);
                showToast('Approved! Timetable updated. ✓', 'success');
            } else {
                showToast('Request rejected.', 'info');
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to respond', 'error');
        }
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    const markNotificationRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        } catch (err) {}
    };

    const exportCSV = (dataToExport, filename) => {
        const headers = ['User', 'Venue', 'Date', 'Start Time', 'End Time', 'Status', 'Purpose'];
        const rows = dataToExport.map(b => [
            b.user?.username || b.user || 'Unknown',
            b.venue?.name || b.venue || 'Unknown',
            new Date(b.date).toLocaleDateString(),
            b.start_time || b.startTime,
            b.end_time || b.endTime,
            b.status,
            `"${(b.purpose || '').replace(/"/g, '""')}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const filteredVenues = venues.filter(v => {
        const matchSearch = v.name.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === 'all' || v.type === filterType;
        const matchCap = !filterCap || v.capacity >= Number(filterCap);
        return matchSearch && matchType && matchCap;
    });

    const myBookings = bookings.filter(b => b.user?._id === user?.id || b.user === user?.id);
    const pendingBookings = bookings.filter(b => b.status === 'pending');

    if (busy) return (
        <div className="bg-app flex h-screen items-center justify-center">
            <div className="text-center animate-fade-in-up">
                <div className="w-10 h-10 rounded-full border-4 border-red-500 border-t-transparent animate-spin mx-auto mb-4" />
                <p className="text-slate-400 font-medium tracking-wide text-sm uppercase">Loading Dashboard</p>
            </div>
        </div>
    );

    return (
        <div className="bg-app min-h-screen pb-12">
            <Toast toast={toast} onClose={closeToast} />

            <nav className="navbar px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center app-logo-bg shadow-lg">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <span className="text-xl font-black gradient-text">Campus Flow</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-theme">{user?.username}</p>
                        <p className="text-xs text-theme-muted uppercase tracking-wide">{user?.role?.replace('_', ' ')}</p>
                    </div>

                    <button onClick={toggle} className="p-2 rounded-lg transition-colors btn-glass">
                        {isDark ? '☀️' : '🌙'}
                    </button>

                    <button onClick={() => navigate('/profile')} className="p-2 rounded-lg transition-colors hidden sm:block btn-glass"
                        title="My Profile">
                        👤
                    </button>

                    <div className="relative" ref={notifRef}>
                        <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-lg transition-colors relative btn-glass">
                            🔔
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-[var(--dark)]"></span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="absolute right-0 mt-3 w-72 sm:w-80 glass-card shadow-2xl z-50 overflow-hidden animate-fade-in-up">
                                <div className="p-3 border-b border-theme flex justify-between items-center bg-glass">
                                    <h3 className="font-bold text-theme text-sm">Notifications</h3>
                                    {unreadCount > 0 && <span className="text-xs text-red-500">{unreadCount} new</span>}
                                </div>
                                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center text-theme-muted text-sm">No notifications yet.</div>
                                    ) : (
                                        notifications.map(n => (
                                            <div key={n._id} onClick={() => markNotificationRead(n._id)}
                                                className={`p-3 border-b border-[rgba(255,255,255,0.05)] cursor-pointer transition-colors ${!n.isRead ? 'bg-red-500/10' : 'hover:bg-white/5'}`}>
                                                <div className="flex gap-2 items-start">
                                                    <span className="text-lg">{n.type === 'success' ? '✅' : n.type === 'error' ? '❌' : 'ℹ️'}</span>
                                                    <div>
                                                        <h4 className={`text-sm ${!n.isRead ? 'text-theme font-bold' : 'text-gray-400'}`}>{n.title}</h4>
                                                        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                                                        <p className="text-[10px] text-gray-600 mt-1">{new Date(n.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {user?.role === 'sysadmin' && (
                        <button onClick={() => navigate('/admin')}
                            className="text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors btn-purple-ghost">
                            ⚙️ System Admin
                        </button>
                    )}

                    <button id="logout-btn" onClick={handleLogout}
                        className="text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors btn-red-ghost">
                        Logout
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

                <div className="rounded-2xl p-6 mb-8 animate-fade-in-up hero-gradient shadow-xl border border-white/5">
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                        Welcome, {user?.username}.
                    </h1>
                    <p className="text-slate-300 mt-1.5 text-sm font-medium">
                        {isUser ? 'Overview of your venues, schedule, and pending requests.' : 'Management overview of venue requests and system status.'}
                    </p>
                </div>

                {isAdmin && (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                            {[
                                { label: 'Total Bookings', value: bookings.length, color: '#60a5fa' },
                                { label: 'Pending', value: pendingBookings.length, color: '#fbbf24' },
                                { label: 'Approved', value: bookings.filter(b => b.status === 'approved').length, color: '#4ade80' },
                            ].map(c => (
                                <div key={c.label} className="glass-card p-5">
                                    <p className="text-xs text-gray-400 uppercase font-medium mb-1">{c.label}</p>
                                    <p className="text-3xl font-black" style={{ color: c.color }}>{c.value}</p>
                                </div>
                            ))}
                        </div>

                        <AnalyticsChart bookings={bookings} />

                        <div className="glass-card p-6 mb-8">
                            <h2 className="text-lg font-bold text-white mb-4">⏳ Pending Approvals</h2>
                            {pendingBookings.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-4">No pending approvals. ✅</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm table-dark">
                                        <thead>
                                            <tr>
                                                <th className="text-left pb-3 text-gray-500 font-medium">User</th>
                                                <th className="text-left pb-3 text-gray-500 font-medium">Venue</th>
                                                <th className="text-left pb-3 text-gray-500 font-medium">Date</th>
                                                <th className="text-left pb-3 text-gray-500 font-medium">Purpose</th>
                                                <th className="text-left pb-3 text-gray-500 font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                            {pendingBookings.map(b => (
                                                <tr key={b._id}>
                                                    <td className="py-3 text-white font-medium">{b.user?.username || b.user}</td>
                                                    <td className="py-3 text-gray-300">{b.venue?.name || b.venue}</td>
                                                    <td className="py-3 text-gray-300">{new Date(b.date).toLocaleDateString()}</td>
                                                    <td className="py-3 text-gray-400">{b.purpose?.slice(0, 30)}</td>
                                                    <td className="py-3">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleStatus(b._id, 'approved')}
                                                                className="text-xs px-3 py-1 rounded-lg font-semibold"
                                                                style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                                                                ✓ Approve
                                                            </button>
                                                            <button onClick={() => handleStatus(b._id, 'rejected')}
                                                                className="text-xs px-3 py-1 rounded-lg font-semibold"
                                                                style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                                                                ✗ Reject
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="glass-card p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-white">📋 All Booking History</h2>
                                <button onClick={() => exportCSV(bookings, 'all_bookings.csv')}
                                    className="btn-glass text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">
                                    📥 Export CSV
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm table-dark">
                                    <thead>
                                        <tr>
                                            <th className="text-left pb-3 text-gray-500 font-medium">User</th>
                                            <th className="text-left pb-3 text-gray-500 font-medium">Venue</th>
                                            <th className="text-left pb-3 text-gray-500 font-medium">Date</th>
                                            <th className="text-left pb-3 text-gray-500 font-medium">Purpose</th>
                                            <th className="text-left pb-3 text-gray-500 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                        {bookings.map(b => (
                                            <tr key={b._id}>
                                                <td className="py-3 text-white font-medium">{b.user?.username || b.user}</td>
                                                <td className="py-3 text-gray-300">{b.venue?.name || b.venue}</td>
                                                <td className="py-3 text-gray-300">{new Date(b.date).toLocaleDateString()}</td>
                                                <td className="py-3 text-gray-400">{b.purpose?.slice(0, 30)}</td>
                                                <td className="py-3"><StatusBadge status={b.status} /></td>
                                            </tr>
                                        ))}
                                        {bookings.length === 0 && (
                                            <tr><td colSpan={5} className="py-6 text-center text-gray-500">No bookings found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {isUser && (
                    <>
                        {/* Tab Switcher */}
                        <div className="flex gap-4 mb-6 border-b border-gray-800 pb-2">
                            <button onClick={() => setViewMode('list')}
                                className={`text-sm font-bold pb-2 border-b-2 transition-colors ${viewMode === 'list' ? 'border-red-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                                Venues & Requests
                            </button>
                            <button onClick={() => setViewMode('timetable')}
                                className={`text-sm font-bold pb-2 border-b-2 transition-colors ${viewMode === 'timetable' ? 'border-red-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                                {user?.role === 'cr' ? 'Class Schedule' : 'My Timetable'}
                            </button>
                            <button onClick={() => setViewMode('calendar')}
                                className={`text-sm font-bold pb-2 border-b-2 transition-colors ${viewMode === 'calendar' ? 'border-red-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                                Entire Calendar
                            </button>
                        </div>

                        {viewMode === 'calendar' && (
                            <CalendarView bookings={publicBookings} venues={venues} />
                        )}

                        {viewMode === 'timetable' && (
                            <div className="animate-fade-in-up space-y-6">
                                <h2 className="text-xl font-bold text-white mb-2">
                                    {user?.role === 'cr' ? '🏫 Class Schedule' : '📅 My Assigned Timetable'}
                                </h2>

                                {/* ── CR: Add Class Form ── */}
                                {user?.role === 'cr' && (
                                    <div className="glass-card p-5 border border-blue-500/20">
                                        <h3 className="text-sm font-bold text-white mb-4">➕ Add Class to Schedule</h3>
                                        <form onSubmit={handleCrAddTimetable} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Course Code</label>
                                                <input value={crAddForm.courseCode} onChange={e => setCrAddForm(f => ({ ...f, courseCode: e.target.value }))}
                                                    className="input-dark w-full" placeholder="e.g. CS101" required />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Venue</label>
                                                <select value={crAddForm.venue_id} onChange={e => setCrAddForm(f => ({ ...f, venue_id: e.target.value }))} className="input-dark w-full" required>
                                                    <option value="">Select venue...</option>
                                                    {venues.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Faculty</label>
                                                <select value={crAddForm.faculty_id} onChange={e => setCrAddForm(f => ({ ...f, faculty_id: e.target.value }))} className="input-dark w-full" required>
                                                    <option value="">Select faculty...</option>
                                                    {allFaculty.map(f => <option key={f._id} value={f._id}>{f.username}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Day</label>
                                                <select value={crAddForm.dayOfWeek} onChange={e => setCrAddForm(f => ({ ...f, dayOfWeek: e.target.value }))} className="input-dark w-full">
                                                    {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => <option key={d}>{d}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Start Time</label>
                                                <input type="time" value={crAddForm.startTime} onChange={e => setCrAddForm(f => ({ ...f, startTime: e.target.value }))} className="input-dark w-full" required />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">End Time</label>
                                                <input type="time" value={crAddForm.endTime} onChange={e => setCrAddForm(f => ({ ...f, endTime: e.target.value }))} className="input-dark w-full" required />
                                            </div>
                                            <div className="sm:col-span-2 lg:col-span-3">
                                                <button type="submit" disabled={crAddLoading} className="btn-primary w-full">
                                                    {crAddLoading ? '⏳ Adding...' : '➕ Add Class'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}

                                {/* ── Faculty: Incoming Change Requests ── */}
                                {user?.role === 'faculty' && incomingRequests.length > 0 && (
                                    <div className="glass-card p-5 border border-amber-500/30">
                                        <h3 className="text-sm font-bold text-amber-400 mb-4">📋 Pending Change Requests from CRs ({incomingRequests.length})</h3>
                                        <div className="space-y-4">
                                            {incomingRequests.map(req => (
                                                <div key={req._id} className="bg-white/5 rounded-xl p-4">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <span className="text-white font-semibold text-sm">{req.timetable_id?.courseCode}</span>
                                                            <span className="text-gray-400 text-xs ml-2">from {req.requested_by?.username}</span>
                                                        </div>
                                                        <span className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-300 mb-1">
                                                        🏫 {req.timetable_id?.venue_id?.name} — Requesting: <span className="text-blue-400 font-medium">{req.new_day} {req.new_start_time}–{req.new_end_time}</span>
                                                    </p>
                                                    {req.message && <p className="text-xs text-gray-400 italic mb-3">"{req.message}"</p>}
                                                    <div className="flex gap-2 items-center mt-2">
                                                        <input value={respondNote[req._id] || ''} onChange={e => setRespondNote(n => ({ ...n, [req._id]: e.target.value }))}
                                                            className="input-dark flex-1 py-1.5 text-xs" placeholder="Optional note to CR..." />
                                                        <button onClick={() => handleRespondToRequest(req._id, 'approved')}
                                                            className="text-xs px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap"
                                                            style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                                                            ✓ Approve
                                                        </button>
                                                        <button onClick={() => handleRespondToRequest(req._id, 'rejected')}
                                                            className="text-xs px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap"
                                                            style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                                                            ✗ Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── Timetable Cards ── */}
                                {myTimetable.length === 0 ? (
                                    <div className="glass-card p-10 text-center text-gray-400">
                                        <div className="text-4xl mb-3">📭</div>
                                        {user?.role === 'cr' ? 'No classes added yet. Use the form above.' : "No classes assigned. Contact Sysadmin."}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {myTimetable.map(t => (
                                            <div key={t._id} className="glass-card p-5 border-l-4" style={{ borderColor: '#60a5fa' }}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className="font-bold text-white text-lg">{t.courseCode}</h3>
                                                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded font-semibold">{t.dayOfWeek}</span>
                                                </div>
                                                <p className="text-gray-300 text-sm mb-1">🏫 {t.venue_id?.name || 'Unknown Venue'}</p>
                                                {user?.role === 'cr' && t.faculty_id && (
                                                    <p className="text-gray-400 text-xs mb-2">👤 {t.faculty_id?.username}</p>
                                                )}
                                                <div className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg mb-2">
                                                    <span className="text-gray-300 text-sm">⏰ {t.startTime} – {t.endTime}</span>
                                                    {/* Faculty ONLY edit their own classes */}
                                                    {user?.role === 'faculty' && (t.faculty_id?._id === user?.id || t.faculty_id === user?.id) && (
                                                        editModeId === t._id ? (
                                                            <div className="flex items-center gap-1">
                                                                <input type="time" value={editStart} onChange={e => setEditStart(e.target.value)} className="input-dark px-1 py-0.5 text-xs w-20" />
                                                                <span className="text-gray-500 text-xs">-</span>
                                                                <input type="time" value={editEnd} onChange={e => setEditEnd(e.target.value)} className="input-dark px-1 py-0.5 text-xs w-20" />
                                                                <button onClick={() => saveTimetableEdits(t._id)} className="btn-primary py-0.5 px-2 text-xs">Save</button>
                                                                <button onClick={() => setEditModeId(null)} className="text-xs text-gray-500 hover:text-gray-400 ml-1">✕</button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => { setEditModeId(t._id); setEditStart(t.startTime); setEditEnd(t.endTime); }} className="text-xs text-blue-400 hover:text-blue-300">Edit Time</button>
                                                        )
                                                    )}
                                                </div>

                                                {/* Postpone button — CR always, Faculty only for their own class */}
                                                {(user?.role === 'cr' || (user?.role === 'faculty' && (t.faculty_id?._id === user?.id || t.faculty_id === user?.id))) && (
                                                    <button onClick={() => deleteTimetableEntry(t)}
                                                        className="text-xs text-red-400 hover:text-red-300 transition-colors mb-2">
                                                        🗑 Mark as Postponed
                                                    </button>
                                                )}

                                                {/* CR: Request time change button */}
                                                {user?.role === 'cr' && (
                                                    showChangeReqForm === t._id ? (
                                                        <form onSubmit={handleSubmitChangeRequest} className="mt-1 space-y-2 bg-white/5 p-3 rounded-lg">
                                                            <p className="text-xs text-amber-400 font-semibold">📋 Request Reschedule</p>
                                                            <select value={changeReqForm.new_day} onChange={e => setChangeReqForm(f => ({ ...f, new_day: e.target.value, timetable_id: t._id }))} className="input-dark w-full text-xs py-1">
                                                                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => <option key={d}>{d}</option>)}
                                                            </select>
                                                            <div className="flex gap-2">
                                                                <input type="time" value={changeReqForm.new_start_time} onChange={e => setChangeReqForm(f => ({ ...f, new_start_time: e.target.value, timetable_id: t._id }))} className="input-dark w-full text-xs py-1" required />
                                                                <input type="time" value={changeReqForm.new_end_time} onChange={e => setChangeReqForm(f => ({ ...f, new_end_time: e.target.value, timetable_id: t._id }))} className="input-dark w-full text-xs py-1" required />
                                                            </div>
                                                            <input value={changeReqForm.message} onChange={e => setChangeReqForm(f => ({ ...f, message: e.target.value, timetable_id: t._id }))} className="input-dark w-full text-xs py-1" placeholder="Reason for change..." />
                                                            <div className="flex gap-2">
                                                                <button type="submit" disabled={changeReqLoading} className="btn-primary py-1 px-3 text-xs flex-1">{changeReqLoading ? '...' : 'Send to Faculty'}</button>
                                                                <button type="button" onClick={() => setShowChangeReqForm(null)} className="btn-glass py-1 px-3 text-xs rounded-lg">Cancel</button>
                                                            </div>
                                                        </form>
                                                    ) : (
                                                        <button onClick={() => { setShowChangeReqForm(t._id); setChangeReqForm(f => ({ ...f, timetable_id: t._id, new_day: t.dayOfWeek })); }}
                                                            className="text-xs text-amber-400 hover:text-amber-300 transition-colors">
                                                            📋 Request Time Change →
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* ── CR: My Change Request History ── */}
                                {user?.role === 'cr' && myChangeRequests.length > 0 && (
                                    <div className="glass-card p-5">
                                        <h3 className="text-sm font-bold text-white mb-3">📨 My Change Request History</h3>
                                        <div className="space-y-2">
                                            {myChangeRequests.map(req => (
                                                <div key={req._id} className="flex justify-between items-center bg-white/5 px-3 py-2.5 rounded-lg">
                                                    <div>
                                                        <span className="text-white text-xs font-medium">{req.timetable_id?.courseCode}</span>
                                                        <span className="text-gray-400 text-xs ml-2">→ {req.new_day} {req.new_start_time}–{req.new_end_time}</span>
                                                        {req.faculty_note && <p className="text-gray-500 text-xs mt-0.5 italic">Note: "{req.faculty_note}"</p>}
                                                    </div>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                                        req.status === 'approved' ? 'badge-approved' :
                                                        req.status === 'rejected' || req.status === 'conflict' ? 'badge-rejected' : 'badge-pending'
                                                    }`}>{req.status}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {viewMode === 'list' && (
                            <>
                                <div className="glass-card p-4 mb-6 flex flex-wrap gap-3 items-center animate-fade-in-up">
                                    <input value={search} onChange={e => setSearch(e.target.value)}
                                        placeholder="🔍 Search venues..."
                                        className="input-dark flex-1 min-w-40" style={{ padding: '0.5rem 1rem' }} />
                                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                                        className="input-dark w-40" style={{ padding: '0.5rem 1rem' }}>
                                        <option value="all">All Types</option>
                                        <option value="classroom">Classrooms</option>
                                        <option value="seminar_hall">Seminar Halls</option>
                                    </select>
                                    <input type="number" value={filterCap} onChange={e => setFilterCap(e.target.value)}
                                        placeholder="Min capacity"
                                        className="input-dark w-36" style={{ padding: '0.5rem 1rem' }} />
                                    {(search || filterType !== 'all' || filterCap) && (
                                        <button onClick={() => { setSearch(''); setFilterType('all'); setFilterCap(''); }}
                                            className="text-sm px-3 py-2 rounded-lg"
                                            style={{ background: 'rgba(224,32,32,0.2)', color: '#f87171' }}>
                                            Clear ✕
                                        </button>
                                    )}
                                </div>

                                <h2 className="text-xl font-bold text-white mb-4">🏫 Available Venues
                                    <span className="text-sm font-normal text-gray-400 ml-2">({filteredVenues.length} found)</span>
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
                                    {filteredVenues.map((v, i) => (
                                        <div key={v._id} className="venue-card animate-fade-in-up"
                                            style={{ animationDelay: `${i * 0.07}s` }}>
                                            {/* Venue image or gradient placeholder */}
                                            {v.imageUrl ? (
                                                <img src={v.imageUrl} alt={v.name}
                                                    className="w-full h-32 object-cover rounded-xl mb-3" />
                                            ) : (
                                                <div className="w-full h-32 rounded-xl mb-3 flex items-center justify-center text-4xl"
                                                    style={{
                                                        background: v.type === 'classroom'
                                                            ? 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(15,23,42,0.8))'
                                                            : 'linear-gradient(135deg, rgba(79,70,229,0.2), rgba(15,23,42,0.8))'
                                                    }}>
                                                    {v.type === 'classroom' ? '📚' : '🎤'}
                                                </div>
                                            )}

                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="font-bold text-white">{v.name}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.type === 'classroom' ? 'badge-classroom' : 'badge-seminar'}`}>
                                                    {v.type === 'classroom' ? 'Classroom' : 'Seminar Hall'}
                                                </span>
                                            </div>
                                            <p className="text-gray-400 text-sm mb-3">👥 Capacity: {v.capacity}</p>
                                            <button onClick={() => navigate(`/book/${v._id}`)}
                                                className="btn-primary w-full text-center text-sm">
                                                Request Booking →
                                            </button>
                                        </div>
                                    ))}
                                    {filteredVenues.length === 0 && (
                                        <div className="col-span-3 text-center py-10 text-gray-500">
                                            No venues match your search.
                                        </div>
                                    )}
                                </div>

                                <div className="glass-card p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-lg font-bold text-white">📋 My Booking Requests</h2>
                                        <button onClick={() => exportCSV(myBookings, 'my_bookings.csv')}
                                            className="btn-glass text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1">
                                            📥 Export CSV
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm table-dark">
                                            <thead>
                                                <tr>
                                                    <th className="text-left pb-3 text-gray-500 font-medium">Venue</th>
                                                    <th className="text-left pb-3 text-gray-500 font-medium">Date &amp; Time</th>
                                                    <th className="text-left pb-3 text-gray-500 font-medium">Purpose</th>
                                                    <th className="text-left pb-3 text-gray-500 font-medium">Status</th>
                                                    <th className="text-left pb-3 text-gray-500 font-medium">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                {myBookings.map(b => (
                                                    <tr key={b._id}>
                                                        <td className="py-3 text-white font-medium">{b.venue?.name || b.venue}</td>
                                                        <td className="py-3 text-gray-300 text-xs">
                                                            {new Date(b.date).toLocaleDateString()}<br />
                                                            <span className="text-gray-500">{b.startTime || b.start_time} – {b.endTime || b.end_time}</span>
                                                        </td>
                                                        <td className="py-3 text-gray-400">{b.purpose?.slice(0, 30)}</td>
                                                        <td className="py-3"><StatusBadge status={b.status} /></td>
                                                        <td className="py-3">
                                                            {b.status === 'pending' && (
                                                                <button onClick={() => handleCancel(b._id)}
                                                                    className="text-xs px-2 py-1 rounded-lg font-medium"
                                                                    style={{ background: 'rgba(224,32,32,0.15)', color: '#f87171' }}>
                                                                    Cancel
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {myBookings.length === 0 && (
                                                    <tr><td colSpan={5} className="py-6 text-center text-gray-500">No requests yet.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* Feedback Section at the bottom (hidden for sysadmin) */}
                {user?.role !== 'sysadmin' && (
                    <div className="mt-12 glass-card p-6 border-blue-500/20 border justify-center items-center flex flex-col md:flex-row gap-6 max-w-4xl mx-auto">
                        <div className="text-center md:text-left flex-1">
                            <h3 className="text-lg font-bold text-white mb-1">📢 Got Feedback?</h3>
                            <p className="text-sm text-gray-400 max-w-sm">Help us improve Campus Flow. Contact the System Administrator directly with issues or feature requests.</p>
                        </div>
                        <form onSubmit={submitFeedback} className="flex-1 w-full flex items-center gap-2">
                            <input type="text" value={feedMsg} onChange={e => setFeedMsg(e.target.value)} required placeholder="Type your message..." className="input-dark flex-1" />
                            <button disabled={feedLoading} type="submit" className="btn-primary py-[0.55rem] whitespace-nowrap">Send ✉️</button>
                        </form>
                    </div>
                )}

            </main>
        </div>
    );
};

export default Dashboard;
