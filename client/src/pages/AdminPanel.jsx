import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import Toast, { useToast } from '../components/Toast';

const AdminPanel = () => {
    const { user, logout } = useContext(AuthContext);
    const { isDark, toggle } = useTheme();
    const navigate = useNavigate();
    const { toast, showToast, closeToast } = useToast();

    const [users, setUsers] = useState([]);
    const [venues, setVenues] = useState([]);
    const [feedbacks, setFeedbacks] = useState([]);
    const [timetable, setTimetable] = useState([]);

    // Add venue form
    const [vName, setVName] = useState('');
    const [vType, setVType] = useState('classroom');
    const [vCap, setVCap] = useState(60);
    const [vImageUrl, setVImageUrl] = useState('');
    const [vLoading, setVLoading] = useState(false);

    // Add user form
    const [uName, setUName] = useState('');
    const [uPass, setUPass] = useState('');
    const [uRole, setURole] = useState('faculty');
    const [uLoading, setULoading] = useState(false);

    // Add timetable form
    const [tVenueName, setTVenueName] = useState('');
    const [tDay, setTDay] = useState('Monday');
    const [tStart, setTStart] = useState('');
    const [tEnd, setTEnd] = useState('');
    const [tCourse, setTCourse] = useState('');
    const [tFaculty, setTFaculty] = useState('');
    const [tLoading, setTLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [u, v, f, tt] = await Promise.all([
                    api.get('/admin/users'),
                    api.get('/venues'),
                    api.get('/feedback'),
                    api.get('/timetable/all')
                ]);
                setUsers(u.data);
                setVenues(v.data);
                setFeedbacks(f.data);
                setTimetable(tt.data);

                const faculties = u.data.filter(usr => usr.role === 'faculty');
                if (faculties.length > 0) setTFaculty(faculties[0]._id);

            } catch {
                showToast('Failed to load data', 'error');
            }
        };
        load();
    }, []);

    const deleteUser = async (id) => {
        if (!window.confirm('Delete this user?')) return;
        try {
            await api.delete(`/admin/users/${id}`);
            setUsers(prev => prev.filter(u => u._id !== id));
            showToast('User deleted', 'info');
        } catch (err) {
            showToast(err.response?.data?.message || 'Error deleting user', 'error');
        }
    };

    const deleteVenue = async (id) => {
        if (!window.confirm('Delete this venue?')) return;
        try {
            await api.delete(`/admin/venues/${id}`);
            setVenues(prev => prev.filter(v => v._id !== id));
            showToast('Venue deleted', 'info');
        } catch (err) {
            showToast(err.response?.data?.message || 'Error deleting venue', 'error');
        }
    };

    const addVenue = async (e) => {
        e.preventDefault();
        setVLoading(true);
        try {
            const res = await api.post('/admin/venues', { name: vName, type: vType, capacity: Number(vCap), imageUrl: vImageUrl });
            setVenues(prev => [...prev, res.data]);
            setVName(''); setVType('classroom'); setVCap(60); setVImageUrl('');
            showToast(`Venue "${res.data.name}" added! ✓`, 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Error adding venue', 'error');
        } finally {
            setVLoading(false);
        }
    };

    const addUser = async (e) => {
        e.preventDefault();
        setULoading(true);
        try {
            const res = await api.post('/admin/users', { username: uName, password: uPass, role: uRole });
            setUsers(prev => [...prev, res.data]);
            setUName(''); setUPass(''); setURole('faculty');
            showToast(`User "${res.data.username}" created! ✓`, 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Error creating user', 'error');
        } finally {
            setULoading(false);
        }
    };

    const addTimetable = async (e) => {
        e.preventDefault();
        
        const venueObj = venues.find(v => v.name.toLowerCase() === tVenueName.trim().toLowerCase());
        if (!venueObj) {
            return showToast('No class existed with such name', 'error');
        }

        const tVenue = venueObj._id;
        
        setTLoading(true);
        try {
            const res = await api.post('/timetable', { venue_id: tVenue, dayOfWeek: tDay, startTime: tStart, endTime: tEnd, courseCode: tCourse, faculty_id: tFaculty });
            showToast(`Timetable for ${tCourse} scheduled! ✓`, 'success');
            setTStart(''); setTEnd(''); setTCourse('');
        } catch (err) {
            showToast(err.response?.data?.message || 'Error scheduling class', 'error');
        } finally {
            setTLoading(false);
        }
    };

    const markFeedbackRead = async (id) => {
        try {
            await api.put(`/feedback/${id}/read`);
            setFeedbacks(prev => prev.map(f => f._id === id ? { ...f, isRead: true } : f));
        } catch(err) {
            showToast('Failed to sync', 'error');
        }
    };

    const getRoleBadgeStyle = (role) => {
        const styles = {
            sysadmin: { bg: 'rgba(147,51,234,0.2)', color: '#c084fc', border: '1px solid rgba(147,51,234,0.3)', label: 'System Admin' },
            classroom_admin: { bg: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', label: 'Classroom Admin' },
            seminar_admin: { bg: 'rgba(16,185,129,0.2)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', label: 'Seminar Admin' },
            faculty: { bg: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', label: 'Faculty' },
            cr: { bg: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', label: 'Class Rep' },
            event_organizer: { bg: 'rgba(236,72,153,0.2)', color: '#f472b6', border: '1px solid rgba(236,72,153,0.3)', label: 'Event Organizer' }
        };
        return styles[role] || styles['faculty'];
    };

    const statCards = [
        { label: 'Total Users', value: users.length, color: '#c084fc' },
        { label: 'Total Venues', value: venues.length, color: '#60a5fa' },
        { label: 'Classrooms', value: venues.filter(v => v.type === 'classroom').length, color: '#4ade80' },
        { label: 'Unread Feedback', value: feedbacks.filter(f => !f.isRead).length, color: '#f87171' },
    ];

    return (
        <div className="bg-app min-h-screen">
            <Toast toast={toast} onClose={closeToast} />

            <nav className="navbar px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-red-400 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span className="text-xl font-black gradient-text">⚙️ System Admin Panel</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={toggle} className="p-2 rounded-lg btn-glass">
                        {isDark ? '☀️' : '🌙'}
                    </button>
                    <span className="text-sm text-gray-400">{user?.username}</span>
                    <button onClick={() => { logout(); navigate('/login'); }}
                        className="text-sm px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(224,32,32,0.15)', color: '#f87171' }}>
                        Logout
                    </button>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {statCards.map(c => (
                        <div key={c.label} className="glass-card p-5 animate-fade-in-up">
                            <p className="text-xs text-gray-500 uppercase font-medium mb-1">{c.label}</p>
                            <p className="text-3xl font-black" style={{ color: c.color }}>{c.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Add User Form */}
                    <div className="glass-card p-6 animate-fade-in-up">
                        <h2 className="text-lg font-bold text-theme mb-5">👤 Add New User</h2>
                        <form onSubmit={addUser} className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-400 mb-1">Username</label>
                                    <input value={uName} onChange={e => setUName(e.target.value)}
                                        className="input-dark w-full" placeholder="e.g. jdoe_admin" required />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-400 mb-1">Role</label>
                                    <select value={uRole} onChange={e => setURole(e.target.value)} className="input-dark w-full">
                                        <option value="faculty">Faculty</option>
                                        <option value="cr">Class Representative</option>
                                        <option value="classroom_admin">Classroom Admin</option>
                                        <option value="seminar_admin">Seminar Hall Admin</option>
                                        <option value="event_organizer">Event Organizer</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Initial Password</label>
                                <input type="password" value={uPass} onChange={e => setUPass(e.target.value)}
                                    className="input-dark w-full" placeholder="temporary password" required />
                            </div>
                            <button type="submit" disabled={uLoading} className="btn-primary w-full">
                                {uLoading ? '⏳ Adding...' : '➕ Create User'}
                            </button>
                        </form>
                    </div>

                    {/* Add Timetable Form */}
                    <div className="glass-card p-6 animate-fade-in-up">
                        <h2 className="text-lg font-bold text-theme mb-5">📅 Assign Faculty Timetable</h2>
                        <form onSubmit={addTimetable} className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-400 mb-1">Faculty</label>
                                    <select value={tFaculty} onChange={e => setTFaculty(e.target.value)} className="input-dark w-full" required>
                                        {users.filter(u => u.role === 'faculty').map(f => (
                                            <option key={f._id} value={f._id}>{f.username}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-400 mb-1">Venue Name</label>
                                    <input value={tVenueName} onChange={e => setTVenueName(e.target.value)}
                                        className="input-dark w-full" placeholder="e.g. Room 101" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Day</label>
                                    <select value={tDay} onChange={e => setTDay(e.target.value)} className="input-dark w-full">
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => <option key={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Start Time</label>
                                    <input type="time" value={tStart} onChange={e => setTStart(e.target.value)} className="input-dark w-full" required />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">End Time</label>
                                    <input type="time" value={tEnd} onChange={e => setTEnd(e.target.value)} className="input-dark w-full" required />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Course Code</label>
                                    <input value={tCourse} onChange={e => setTCourse(e.target.value)} className="input-dark w-full" placeholder="e.g. CS101" required />
                                </div>
                            </div>
                            <button type="submit" disabled={tLoading} className="btn-primary w-full shadow-lg" style={{ background: 'linear-gradient(135deg, #10b981, #059669)'}}>
                                {tLoading ? '⏳ Scheduling...' : '📅 Save Class Schedule'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                     {/* Feedback Panel */}
                    <div className="glass-card p-6 animate-fade-in-up">
                        <h2 className="text-lg font-bold text-theme mb-4">💬 System Feedback</h2>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                            {feedbacks.length === 0 && <p className="text-gray-500 text-sm">No feedback received.</p>}
                            {feedbacks.map(f => (
                                <div key={f._id} onClick={() => markFeedbackRead(f._id)}
                                     className={`p-3 rounded-xl border cursor-pointer transition-colors ${f.isRead ? 'border-transparent bg-white/5' : 'border-red-500/30 bg-red-500/10'}`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-semibold" style={{ color: f.isRead ? '#9ca3af' : '#f87171' }}>
                                            {f.user_id?.username || 'Unknown'} <span className="text-xs font-normal text-gray-500">({f.user_id?.role})</span>
                                        </span>
                                        <span className="text-xs text-gray-500">{new Date(f.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className={`text-sm ${f.isRead ? 'text-gray-400' : 'text-gray-200'}`}>
                                        "{f.message}"
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Venues Panel */}
                    <div className="glass-card p-6 animate-fade-in-up flex flex-col gap-5">
                        <h2 className="text-lg font-bold text-theme">🏫 Add New Venue</h2>
                        <form onSubmit={addVenue} className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Venue Name</label>
                                    <input value={vName} onChange={e => setVName(e.target.value)}
                                        className="input-dark w-full" placeholder="e.g. Room 101" required />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Type</label>
                                    <select value={vType} onChange={e => setVType(e.target.value)} className="input-dark w-full">
                                        <option value="classroom">Classroom</option>
                                        <option value="seminar_hall">Seminar Hall</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">Capacity</label>
                                    <input type="number" value={vCap} onChange={e => setVCap(e.target.value)}
                                        className="input-dark w-full" placeholder="e.g. 60" min={1} required />
                                </div>
                            </div>
                            <button type="submit" disabled={vLoading} className="btn-primary w-full">
                                {vLoading ? '⏳ Adding...' : '➕ Add Venue'}
                            </button>
                        </form>

                        <div>
                            <h3 className="text-sm font-semibold text-theme mb-3">All Venues ({venues.length})</h3>
                            <div className="overflow-x-auto max-h-64 custom-scrollbar">
                                <table className="w-full text-sm table-dark">
                                    <thead>
                                        <tr>
                                            <th className="text-left pb-3 text-gray-500 font-medium">Name</th>
                                            <th className="text-left pb-3 text-gray-500 font-medium">Type</th>
                                            <th className="text-left pb-3 text-gray-500 font-medium">Cap.</th>
                                            <th className="text-left pb-3 text-gray-500 font-medium">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0' }}>
                                        {venues.map(v => (
                                            <tr key={v._id}>
                                                <td className="py-3 text-theme font-medium">{v.name}</td>
                                                <td className="py-3">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.type === 'classroom' ? 'badge-classroom' : 'badge-seminar'}`}>
                                                        {v.type === 'classroom' ? 'Classroom' : 'Seminar'}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-gray-400 text-xs">{v.capacity}</td>
                                                <td className="py-3">
                                                    <button onClick={() => deleteVenue(v._id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {venues.length === 0 && (
                                            <tr><td colSpan={4} className="py-5 text-center text-gray-500 text-sm">No venues added yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="glass-card p-6 animate-fade-in-up">
                    <h2 className="text-lg font-bold text-theme mb-4">👥 System Users ({users.length})</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm table-dark">
                            <thead>
                                <tr>
                                    <th className="text-left pb-3 text-gray-500 font-medium">Username</th>
                                    <th className="text-left pb-3 text-gray-500 font-medium">Assigned Role</th>
                                    <th className="text-left pb-3 text-gray-500 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0' }}>
                                {users.map(u => {
                                    const s = getRoleBadgeStyle(u.role);
                                    return (
                                        <tr key={u._id}>
                                            <td className="py-3 text-theme font-medium">{u.username}</td>
                                            <td className="py-3">
                                                <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: s.bg, color: s.color, border: s.border }}>
                                                    {s.label}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                {u.role !== 'sysadmin' ? (
                                                    <button onClick={() => deleteUser(u._id)}
                                                        className="text-xs px-3 py-1 rounded-lg transition-colors"
                                                        style={{ background: 'rgba(224,32,32,0.1)', color: '#f87171' }}
                                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(224,32,32,0.2)'}
                                                        onMouseOut={e => e.currentTarget.style.background = 'rgba(224,32,32,0.1)'}>
                                                        Delete
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-600 italic">Protected Core Admin</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Timetable Overview */}
                <div className="glass-card p-6 animate-fade-in-up mt-8">
                    <h2 className="text-lg font-bold text-theme mb-4">📅 Full Class Timetable ({timetable.length} entries)</h2>
                    <div className="overflow-x-auto custom-scrollbar max-h-96">
                        <table className="w-full text-sm table-dark">
                            <thead>
                                <tr>
                                    <th className="text-left pb-3 text-gray-500 font-medium">Course</th>
                                    <th className="text-left pb-3 text-gray-500 font-medium">Venue</th>
                                    <th className="text-left pb-3 text-gray-500 font-medium">Faculty</th>
                                    <th className="text-left pb-3 text-gray-500 font-medium">Day</th>
                                    <th className="text-left pb-3 text-gray-500 font-medium">Time</th>
                                    <th className="text-left pb-3 text-gray-500 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0' }}>
                                {timetable.map(t => (
                                    <tr key={t._id}>
                                        <td className="py-3 text-theme font-semibold">{t.courseCode}</td>
                                        <td className="py-3 text-gray-400 text-xs">{t.venue_id?.name || '—'}</td>
                                        <td className="py-3 text-gray-400 text-xs">{t.faculty_id?.username || '—'}</td>
                                        <td className="py-3">
                                            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-medium">{t.dayOfWeek}</span>
                                        </td>
                                        <td className="py-3 text-gray-300 text-xs font-mono">{t.startTime} – {t.endTime}</td>
                                        <td className="py-3">
                                            <button onClick={async () => {
                                                if (!window.confirm('Delete this timetable entry?')) return;
                                                await api.delete(`/timetable/${t._id}`);
                                                setTimetable(prev => prev.filter(x => x._id !== t._id));
                                                showToast('Entry deleted', 'info');
                                            }} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {timetable.length === 0 && (
                                    <tr><td colSpan={6} className="py-6 text-center text-gray-500">No timetable entries yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default AdminPanel;
