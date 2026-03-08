import { useState, useEffect } from 'react';

/* ─────────────────────────────────────────────
   useToast hook  –  call in any component
   const { toast, showToast } = useToast();
   showToast('Booking submitted!', 'success');
   ───────────────────────────────────────────── */
export const useToast = () => {
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type, id: Date.now() });
    };

    const closeToast = () => setToast(null);

    return { toast, showToast, closeToast };
};

/* ─────────────────────────────────────────────
   Toast UI component
   <Toast toast={toast} onClose={closeToast} />
   ───────────────────────────────────────────── */
const Toast = ({ toast, onClose }) => {
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(onClose, 3500);
        return () => clearTimeout(timer);
    }, [toast, onClose]);

    if (!toast) return null;

    const styles = {
        success: { bar: 'bg-green-500', icon: '✓', bg: 'bg-white border-green-200 text-green-800' },
        error: { bar: 'bg-red-500', icon: '✕', bg: 'bg-white border-red-200 text-red-800' },
        info: { bar: 'bg-blue-500', icon: 'ℹ', bg: 'bg-white border-blue-200 text-blue-800' },
    };

    const s = styles[toast.type] || styles.info;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-once">
            <div className={`flex items-center gap-3 border shadow-lg rounded-xl px-4 py-3 min-w-64 max-w-sm ${s.bg}`}>
                {/* Coloured accent bar */}
                <div className={`w-1 self-stretch rounded-full ${s.bar}`} />
                {/* Icon */}
                <span className={`text-sm font-bold w-5 h-5 rounded-full flex items-center justify-center ${s.bar} text-white shrink-0`}>
                    {s.icon}
                </span>
                {/* Message */}
                <p className="text-sm font-medium flex-1">{toast.message}</p>
                {/* Close */}
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none shrink-0">×</button>
            </div>
        </div>
    );
};

export default Toast;
