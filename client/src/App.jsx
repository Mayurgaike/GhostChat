import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import NamePrompt from './components/NamePrompt';
import RoomSelect from './components/RoomSelect';
import ChatLayout from './components/ChatLayout';

const App = () => {
  const [username, setUsername] = useState(() => {
    // Try to get username from localStorage on initial load
    return localStorage.getItem('ghostchat_username') || '';
  });

  // Persist username to localStorage whenever it changes
  useEffect(() => {
    if (username) {
      localStorage.setItem('ghostchat_username', username);
    }
  }, [username]);

  // Custom wrapper to check for username before allowing access to protected routes
  const ProtectedRoute = ({ children }) => {
    if (!username) {
      return <Navigate to="/" />;
    }
    return children;
  };

  return (
    <Routes>
      <Route path="/" element={
        username ? <Navigate to="/rooms" /> : <NamePrompt setUsername={setUsername} />
      } />
      <Route path="/rooms" element={
        <ProtectedRoute>
          <RoomSelect username={username} />
        </ProtectedRoute>
      } />
      <Route path="/chat/:roomId" element={
        <ProtectedRoute>
          <ChatLayout username={username} />
        </ProtectedRoute>
      } />
    </Routes>
  );
};

export default App;