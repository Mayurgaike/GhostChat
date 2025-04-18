import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress } from '@mui/material';

const NamePrompt = ({ setUsername }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUsername = localStorage.getItem('ghostchat_username');
    if (storedUsername) setName(storedUsername);
  }, []);

  const handleContinue = () => {
    if (name.trim()) {
      setLoading(true);
      localStorage.setItem('ghostchat_username', name.trim());
      setUsername(name.trim());
      setTimeout(() => navigate('/rooms'), 500);
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #0f0f0f, #1a0033)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 400,
          p: 4,
          borderRadius: 4,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 0 30px rgba(0, 0, 0, 0.5)',
          textAlign:'center'
        }}
      >
        <Typography color="white" fontSize={30} fontWeight={600} mb={2}>
          Welcome !
        </Typography>
        <Box
          component="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
          placeholder="Enter your name..."
          sx={{
            width: '100%',
            px: 2,
            py: 1.5,
            borderRadius: 2,
            border: '1px solid #555',
            outline: 'none',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            mb: 3,
            fontSize: 16,
            '&::placeholder': { color: '#aaa' },
          }}
        />
        <Button
          variant="contained"
          onClick={handleContinue}
          fullWidth
          sx={{
            backgroundColor: '#a855f7',
            textTransform: 'none',
            fontWeight: 'bold',
            '&:hover': { backgroundColor: '#9333ea' },
          }}
          disabled={!name.trim() || loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Continue'}
        </Button>
      </Box>
    </Box>
  );
};

export default NamePrompt;