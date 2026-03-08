import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BookVenue from './pages/BookVenue';
import AdminPanel from './pages/AdminPanel';
import ProfilePage from './pages/ProfilePage';
import LandingPage from './pages/LandingPage';
import AIAssistant from './components/AIAssistant';

// ProtectedRoute: blocks access to pages that require login
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return (
    <div className="flex h-screen items-center justify-center"
      style={{ background: '#0d0d0d', color: '#e02020' }}>
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-4 border-red-500 border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" />;
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/book/:id" element={<ProtectedRoute allowedRoles={['faculty', 'cr', 'event_organizer']}><BookVenue /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['sysadmin']}><AdminPanel /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <AIAssistant />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
