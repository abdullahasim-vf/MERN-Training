import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import useAuthStore from './store/authStore';
import './index.css';

const AppContent = () => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (location.pathname === '/home' && isAuthenticated) {
    return <Home />;
  }

  if (location.pathname === '/register' && !isAuthenticated) {
    return <Register />;
  }

  return <Login />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/home" element={<AppContent />} />
        <Route path="/register" element={<AppContent />} />
      </Routes>
    </Router>
  );
}

export default App;
