import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

  const handleLogin = (tokenData, userData) => {
    localStorage.setItem('token', tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(tokenData);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <Router>
      <div className="demo-banner">
        ⚠️ DEMO / SIMULATED PAYMENT SYSTEM - No real money is processed
      </div>
      <Routes>
        <Route 
          path="/login" 
          element={!token ? <Auth onLogin={handleLogin} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/*" 
          element={token ? <Dashboard user={user} setUser={setUser} onLogout={handleLogout} token={token} /> : <Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
