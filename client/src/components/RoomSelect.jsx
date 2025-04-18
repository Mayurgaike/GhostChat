import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import RefreshIcon from '@mui/icons-material/Refresh';
import socket from '../socket';

const RoomSelect = ({ username }) => {
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [roomIdToJoin, setRoomIdToJoin] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = () => {
      setLoading(true);
      socket.emit('get-available-rooms');
    };
    const handleAvailableRooms = (rooms) => {
      setAvailableRooms(rooms);
      setLoading(false);
    };
    socket.on('available-rooms', handleAvailableRooms);
    fetchRooms();
    return () => socket.off('available-rooms', handleAvailableRooms);
  }, []);

  const handleCreateRoom = () => {
    const randomId = Math.random().toString(36).substring(2, 8);
    navigate(`/chat/${randomId}`);
  };

  const handleJoinRoom = () => {
    if (roomIdToJoin.trim()) navigate(`/chat/${roomIdToJoin.trim()}`);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0f0f, #1a0033)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        px: 2,
        color: 'white',
      }}
    >
      <Typography fontSize={24} fontWeight={600} mb={4}>Heyy, {username}</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <Button
          variant="contained"
          startIcon={<AddCircleIcon />}
          onClick={handleCreateRoom}
          sx={{ backgroundColor: '#9333ea', fontWeight: 'bold', textTransform: 'none' }}
        >
          Create Room
        </Button>
        <Button
          variant="outlined"
          startIcon={<MeetingRoomIcon />}
          onClick={() => setJoinDialogOpen(true)}
          sx={{ borderColor: '#9333ea', color: '#ccc', textTransform: 'none' }}
        >
          Join Room
        </Button>
      </Box>
      <Box
        sx={{
          width: '100%',
          maxWidth: 500,
          p: 3,
          borderRadius: 3,
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 0 25px rgba(0,0,0,0.4)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography fontSize={18}>Available Rooms</Typography>
          <IconButton onClick={() => socket.emit('get-available-rooms')} sx={{ color: '#ccc' }}>
            <RefreshIcon />
          </IconButton>
        </Box>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : availableRooms.length === 0 ? (
          <Typography color="#aaa" textAlign="center">
            No active rooms available. Create a new one!
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {availableRooms.map((room) => (
              <Button
                key={room.roomId}
                onClick={() => navigate(`/chat/${room.roomId}`)}
                sx={{
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  borderRadius: 20,
                  px: 3,
                  '&:hover': {
                    background: 'rgba(255,255,255,0.2)',
                  },
                }}
              >
                {room.roomId} ({room.userCount})
              </Button>
            ))}
          </Box>
        )}
      </Box>

      <Dialog open={joinDialogOpen} onClose={() => setJoinDialogOpen(false)}>
        <Box sx={{background: 'linear-gradient(135deg, #1a0033, #0f0f0f)', color:'#ccc'}}>
        <DialogTitle>Enter Room ID</DialogTitle>
        <DialogContent>
          <Box
            component="input"
            autoFocus
            placeholder="Room ID"
            value={roomIdToJoin}
            onChange={(e) => setRoomIdToJoin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            sx={{
              width: '100%',
              px: 2,
              py: 1.5,
              borderRadius: 2,
              border: '1px solid #555',
              outline: 'none',
              background: '#222',
              color: 'white',
              fontSize: 16,
              '&::placeholder': { color: '#aaa' },
              mt: 1,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinDialogOpen(false)} sx={{color:"#ccc"}}>Cancel</Button>
          <Button onClick={handleJoinRoom} sx={{color:'#A855F7'}}>Join</Button>
        </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default RoomSelect;