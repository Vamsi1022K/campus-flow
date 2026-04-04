import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import Toast, { useToast } from '../components/Toast';

const ChangePassword = () => {
    const { user, logout } = useContext(AuthContext);
    const { isDark, toggle } = useTheme();
    const navigate = useNavigate();
    const { toast, showToast, closeToast } = useToast();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    
    // Toggle state for all 3 inputs independently
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const pwStrength = (p) => {
        if (!p) return null;
        if (p.length < 6) return { label: 'Too short', color: '#f87171', width: '20%' };
        if (p.length < 8) return { label: 'Weak', color: '#fbbf24', width: '40%' };
        if (!/[A-Z]/.test(p) || !/[0-9]/.test(p)) return { label: 'Fair', color: '#fb923c', width: '60%' };
        if (p.length >= 12) return { label: 'Strong', color: '#4ade80', width: '100%' };
        return { label: 'Good', color: '#4ade80', width: '80%' };
    };
    const strength = pwStrength(newPassword);

    const handleSubmit = async (e) => {
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
            setTimeout(() => navigate('/profile'), 2000);
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to change password', 'error');
        } finally {
            setPwLoading(false);
        }
    };

    const PasswordInput = ({ label, val, setVal, show, setShow, placeholder }) => (
        <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">{label}</label>
            <div className="relative">
                <input type={show ? 'text' : 'password'} value={val}
                    onChange={e => setVal(e.target.value)}
                    className="input-dark w-full pr-12"
                    placeholder={placeholder} required />
                <button type="button" onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    aria-label={show ? "Hide password" : "Show password"}>
                    {show ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 011.5-2.825m2.77-2.77A10.035 10.035 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-1.5 2.825m-2.77 2.77A10.035 10.035 0 0112 19M15 12a3 3 0 01-2.94 3.01m-3.03-.06A3 3 0 019.03 12.03M3 3l18 18" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );

    return (
        <div className="bg-app min-h-screen">
            <Toast toast={toast} onClose={closeToast} />

            {/* Navbar */}
            <nav className="navbar px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/profile')} className="text-gray-400 hover:text-red-400 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span className="text-xl font-black gradient-text">Security Settings</span>
                </div>
            </nav>

            <main className="max-w-md mx-auto px-4 py-12">
                <div className="glass-card p-8 animate-fade-in-up shadow-2xl">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #e02020, #7b0d0d)' }}>
                            🔐
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-theme">Change Password</h1>
                            <p className="text-gray-400 text-sm mt-1">Keep your account secure.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <PasswordInput label="Current Password" val={currentPassword} setVal={setCurrentPassword}
                            show={showCurrent} setShow={setShowCurrent} placeholder="Enter your current password" />
                        
                        <div className="pt-2">
                            <PasswordInput label="New Password" val={newPassword} setVal={setNewPassword}
                                show={showNew} setShow={setShowNew} placeholder="Min 8 chars, uppercase + number" />
                            
                            {/* Password strength indicator */}
                            {newPassword && strength && (
                                <div className="mt-3">
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="text-gray-400">Password strength</span>
                                        <span className="font-semibold" style={{ color: strength.color }}>{strength.label}</span>
                                    </div>
                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                        <div className="h-full transition-all duration-500 ease-out"
                                            style={{ width: strength.width, background: strength.color }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pb-2">
                            <PasswordInput label="Confirm New Password" val={confirmPassword} setVal={setConfirmPassword}
                                show={showConfirm} setShow={setShowConfirm} placeholder="Repeat your new password" />
                                
                            {/* Match indicator */}
                            {confirmPassword && (
                                <p className="text-xs font-medium mt-2 flex items-center gap-1.5" 
                                   style={{ color: newPassword === confirmPassword ? '#4ade80' : '#f87171' }}>
                                    {newPassword === confirmPassword 
                                        ? <><svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> Passwords match</>
                                        : <><svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg> Passwords do not match</>}
                                </p>
                            )}
                        </div>

                        <button type="submit" disabled={pwLoading} className="btn-primary w-full py-3.5 mt-4 text-[15px]">
                            {pwLoading ? '⏳ Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default ChangePassword;
