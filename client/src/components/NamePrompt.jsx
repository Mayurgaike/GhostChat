import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  CircularProgress,
} from '@mui/material';

const NamePrompt = ({ setUsername }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check for previously stored username on component mount
  useEffect(() => {
    const storedUsername = localStorage.getItem('ghostchat_username');
    if (storedUsername) {
      setName(storedUsername);
    }
  }, []);

  const handleContinue = () => {
    if (name.trim()) {
      setLoading(true);
      // Store username in localStorage
      localStorage.setItem('ghostchat_username', name.trim());
      // Set username in app state
      setUsername(name.trim());
      // Navigate to rooms page
      setTimeout(() => {
        navigate('/rooms');
      }, 500);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#0e0e0e',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={4}
          sx={{
            backgroundColor: '#1e1e1e',
            padding: 4,
            borderRadius: 3,
            textAlign: 'center',
            width: '100%',
          }}
        >
          <Typography variant="h4" sx={{ color: '#fff', mb: 3 }}>
            Welcome to GhostChat
          </Typography>
          <Typography variant="body1" sx={{ color: '#bbb', mb: 3 }}>
            Anonymous, secure, and ephemeral messaging without accounts
          </Typography>
          
          <TextField
            fullWidth
            label="Enter your name"
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
            sx={{ 
              input: { color: '#fff' }, 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#444',
                },
                '&:hover fieldset': {
                  borderColor: '#666',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#9c27b0',
                },
              },
            }}
            InputLabelProps={{
              style: { color: '#ccc' },
            }}
            disabled={loading}
          />
          
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={handleContinue}
            sx={{ mt: 2 }}
            disabled={!name.trim() || loading}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Continue"}
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default NamePrompt;