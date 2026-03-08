import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import Toast, { useToast } from '../components/Toast';

const ProfilePage = () => {
    const { user, logout } = useContext(AuthContext);
    const { isDark, toggle } = useTheme();
    const navigate = useNavigate();
    const { toast, showToast, closeToast } = useToast();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwLoading, setPwLoading] = useState(false);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return showToast('New passwords do not match', 'error');
        }
        if (newPassword.length < 6) {
            return showToast('Password must be at least 6 characters', 'error');
        }
        setPwLoading(true);
        try {
            const res = await api.put('/users/change-password', { currentPassword, newPassword });
            showToast(res.data.message, 'success');
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to change password', 'error');
        } finally {
            setPwLoading(false);
        }
    };

    const roleColors = {
        faculty: { bg: '#1a6ef520', text: '#60a5fa', border: '#1a6ef540' },
        cr: { bg: '#f5a50020', text: '#fbbf24', border: '#f5a50040' },
        classroom_admin: { bg: '#e0202020', text: '#f87171', border: '#e0202040' },
        sysadmin: { bg: '#9333ea20', text: '#c084fc', border: '#9333ea40' },
        seminar_admin: { bg: '#10b98120', text: '#34d399', border: '#10b98140' },
    };
    const rc = roleColors[user?.role] || roleColors.faculty;

    return (
        <div className="bg-app min-h-screen">
            <Toast toast={toast} onClose={closeToast} />

            {/* Navbar */}
            <nav className="navbar px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-red-400 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span className="text-xl font-black gradient-text">My Profile</span>
                </div>
                <div className="flex items-center gap-3">
                    {/* Dark mode toggle */}
                    <button onClick={toggle} className="p-2 rounded-lg transition-colors"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                        {isDark ? '☀️' : '🌙'}
                    </button>
                    <button onClick={() => { logout(); navigate('/login'); }}
                        className="text-sm font-medium px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(224,32,32,0.15)', color: '#f87171' }}>
                        Logout
                    </button>
                </div>
            </nav>

            <main className="max-w-2xl mx-auto px-4 py-10">

                {/* Profile Header */}
                <div className="glass-card p-8 mb-6 text-center animate-fade-in-up"
                    style={{ background: 'linear-gradient(135deg, rgba(224,32,32,0.1), rgba(26,110,245,0.05))' }}>
                    <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4"
                        style={{ background: 'linear-gradient(135deg, #e02020, #7b0d0d)' }}>
                        👤
                    </div>
                    <h1 className="text-2xl font-black text-white">{user?.username}</h1>
                    <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold"
                        style={{ background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>
                        {user?.role?.replace('_', ' ').toUpperCase()}
                    </span>
                </div>

                {/* Change Password */}
                <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                        🔐 Change Password
                    </h2>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Current Password</label>
                            <input type="password" value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                className="input-dark" placeholder="Enter current password" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">New Password</label>
                            <input type="password" value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="input-dark" placeholder="Enter new password (min 6 chars)" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm New Password</label>
                            <input type="password" value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="input-dark" placeholder="Confirm new password" required />
                        </div>
                        <button type="submit" disabled={pwLoading} className="btn-primary w-full">
                            {pwLoading ? '⏳ Updating...' : '🔐 Update Password'}
                        </button>
                    </form>
                </div>

                {/* App Preferences */}
                <div className="glass-card p-6 mt-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <h2 className="text-lg font-bold text-white mb-5">⚙️ Preferences</h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white font-medium">Dark Mode</p>
                            <p className="text-gray-400 text-sm">Toggle between dark and light theme</p>
                        </div>
                        <button onClick={toggle}
                            className="relative w-12 h-6 rounded-full transition-colors duration-200"
                            style={{ background: isDark ? '#e02020' : '#374151' }}>
                            <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200"
                                style={{ transform: isDark ? 'translateX(26px)' : 'translateX(2px)' }} />
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default ProfilePage;
