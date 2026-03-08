import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import Toast, { useToast } from '../components/Toast';

/* ── Small reusable section card ── */
const Section = ({ title, children }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-base font-semibold text-slate-700">{title}</h2>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const AdminPanel = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const { toast, showToast, closeToast } = useToast();

    const [users, setUsers] = useState([]);
    const [venues, setVenues] = useState([]);
    const [loading, setLoading] = useState(true);

    // New venue form state
    const [venueName, setVenueName] = useState('');
    const [venueType, setVenueType] = useState('classroom');
    const [venueCapacity, setVenueCapacity] = useState('');
    const [venueLoading, setVenueLoading] = useState(false);

    // Load all data
    useEffect(() => {
        const load = async () => {
            try {
                const [u, v] = await Promise.all([
                    api.get('/admin/users'),
                    api.get('/venues'),
                ]);
                setUsers(u.data);
                setVenues(v.data);
            } catch (err) {
                showToast('Failed to load data', 'error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Delete a user
    const deleteUser = async (id, username) => {
        if (!window.confirm(`Delete user "${username}"?`)) return;
        try {
            await api.delete(`/admin/users/${id}`);
            setUsers(prev => prev.filter(u => u._id !== id));
            showToast(`User "${username}" deleted`, 'success');
        } catch {
            showToast('Failed to delete user', 'error');
        }
    };

    // Delete a venue
    const deleteVenue = async (id, name) => {
        if (!window.confirm(`Delete venue "${name}"?`)) return;
        try {
            await api.delete(`/admin/venues/${id}`);
            setVenues(prev => prev.filter(v => v._id !== id));
            showToast(`Venue "${name}" deleted`, 'success');
        } catch {
            showToast('Failed to delete venue', 'error');
        }
    };

    // Add a venue
    const addVenue = async (e) => {
        e.preventDefault();
        setVenueLoading(true);
        try {
            const res = await api.post('/admin/venues', {
                name: venueName,
                type: venueType,
                capacity: Number(venueCapacity),
            });
            setVenues(prev => [...prev, res.data]);
            setVenueName(''); setVenueType('classroom'); setVenueCapacity('');
            showToast(`Venue "${res.data.name}" added!`, 'success');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to add venue', 'error');
        } finally {
            setVenueLoading(false);
        }
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    const roleBadgeColor = {
        sysadmin: 'bg-purple-100 text-purple-700',
        classroom_admin: 'bg-blue-100 text-blue-700',
        seminar_admin: 'bg-indigo-100 text-indigo-700',
        faculty: 'bg-green-100 text-green-700',
        cr: 'bg-yellow-100 text-yellow-700',
        event_organizer: 'bg-orange-100 text-orange-700',
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <p className="text-slate-400 animate-pulse">Loading admin panel...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <Toast toast={toast} onClose={closeToast} />

            {/* Navbar */}
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold text-purple-600">System Admin Panel</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500 hidden sm:block">{user?.username}</span>
                    <button onClick={handleLogout} className="text-sm text-red-500 font-medium hover:text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">
                        Logout
                    </button>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

                {/* Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Users', value: users.length, color: 'text-purple-600', bg: 'bg-purple-50' },
                        { label: 'Total Venues', value: venues.length, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Classrooms', value: venues.filter(v => v.type === 'classroom').length, color: 'text-green-600', bg: 'bg-green-50' },
                        { label: 'Seminar Halls', value: venues.filter(v => v.type === 'seminar_hall').length, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    ].map(c => (
                        <div key={c.label} className={`${c.bg} rounded-xl px-5 py-4`}>
                            <p className="text-slate-500 text-xs uppercase font-medium">{c.label}</p>
                            <p className={`text-3xl font-bold ${c.color} mt-1`}>{c.value}</p>
                        </div>
                    ))}
                </div>

                {/* Add Venue Form */}
                <Section title="➕ Add New Venue">
                    <form onSubmit={addVenue} className="flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-40">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Venue Name</label>
                            <input
                                value={venueName}
                                onChange={e => setVenueName(e.target.value)}
                                placeholder="e.g. Room 103"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                            <select
                                value={venueType}
                                onChange={e => setVenueType(e.target.value)}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 outline-none bg-white"
                            >
                                <option value="classroom">Classroom</option>
                                <option value="seminar_hall">Seminar Hall</option>
                            </select>
                        </div>
                        <div className="w-32">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Capacity</label>
                            <input
                                type="number"
                                value={venueCapacity}
                                onChange={e => setVenueCapacity(e.target.value)}
                                placeholder="60"
                                min="1"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={venueLoading}
                            className="bg-purple-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                            {venueLoading ? 'Adding...' : 'Add Venue'}
                        </button>
                    </form>
                </Section>

                {/* Venues List */}
                <Section title={`🏫 Venues (${venues.length})`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="pb-3 font-medium">Name</th>
                                    <th className="pb-3 font-medium">Type</th>
                                    <th className="pb-3 font-medium">Capacity</th>
                                    <th className="pb-3 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {venues.map(v => (
                                    <tr key={v._id} className="hover:bg-slate-50">
                                        <td className="py-3 font-medium text-slate-800">{v.name}</td>
                                        <td className="py-3">
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.type === 'classroom' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                                {v.type === 'classroom' ? 'Classroom' : 'Seminar Hall'}
                                            </span>
                                        </td>
                                        <td className="py-3 text-slate-500">{v.capacity}</td>
                                        <td className="py-3 text-right">
                                            <button
                                                onClick={() => deleteVenue(v._id, v.name)}
                                                className="text-xs text-red-500 hover:text-red-700 font-medium bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {venues.length === 0 && (
                                    <tr><td colSpan={4} className="py-6 text-center text-slate-400">No venues found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Section>

                {/* Users List */}
                <Section title={`👥 System Users (${users.length})`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="pb-3 font-medium">Username</th>
                                    <th className="pb-3 font-medium">Role</th>
                                    <th className="pb-3 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {users.map(u => (
                                    <tr key={u._id} className="hover:bg-slate-50">
                                        <td className="py-3 font-medium text-slate-800">{u.username}</td>
                                        <td className="py-3">
                                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${roleBadgeColor[u.role] || 'bg-slate-100 text-slate-600'}`}>
                                                {u.role?.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="py-3 text-right">
                                            {u.role !== 'sysadmin' ? (
                                                <button
                                                    onClick={() => deleteUser(u._id, u.username)}
                                                    className="text-xs text-red-500 hover:text-red-700 font-medium bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-300">Protected</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr><td colSpan={3} className="py-6 text-center text-slate-400">No users found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Section>

            </main>
        </div>
    );
};

export default AdminPanel;
