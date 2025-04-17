import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
  TextField,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Paper,
  CircularProgress,
  Divider,
  Avatar,
  Container,
  IconButton,
} from "@mui/material";
import RefreshIcon from '@mui/icons-material/Refresh';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import socket from '../socket';

const RoomSelect = ({ username }) => {
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [roomIdToJoin, setRoomIdToJoin] = useState("");
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  // Fetch available rooms on component mount
  useEffect(() => {
    const fetchRooms = () => {
      setLoading(true);
      socket.emit('get-available-rooms');
    };

    const handleAvailableRooms = (rooms) => {
      setAvailableRooms(rooms);
      setLoading(false);
    };

    // Register event listeners
    socket.on('available-rooms', handleAvailableRooms);
    
    // Fetch rooms immediately
    fetchRooms();
    
    // Clean up listeners
    return () => {
      socket.off('available-rooms', handleAvailableRooms);
    };
  }, []);

  const handleCreateRoom = () => {
    const randomId = Math.random().toString(36).substring(2, 8); // 6-char ID
    navigate(`/chat/${randomId}`);
  };

  const handleJoinRoom = () => {
    if (roomIdToJoin.trim()) {
      navigate(`/chat/${roomIdToJoin.trim()}`);
    }
  };

  const handleRefreshRooms = () => {
    setLoading(true);
    socket.emit('get-available-rooms');
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
          color: '#fff',
          gap: 3,
          py: 4,
        }}
      >
        <Typography variant="h4" sx={{ mb: 2 }}>Welcome, {username}</Typography>

        <Stack spacing={2} direction="row" sx={{ mb: 4 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleCreateRoom}
            startIcon={<AddCircleIcon />}
            size="large"
          >
            Create New Room
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setJoinDialogOpen(true)}
            startIcon={<MeetingRoomIcon />}
            size="large"
          >
            Join Room
          </Button>
        </Stack>

        <Paper 
          elevation={3} 
          sx={{ 
            width: '100%', 
            backgroundColor: '#1f1f1f',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <Box 
            sx={{ 
              p: 2, 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #333'
            }}
          >
            <Typography variant="h6">Available Rooms</Typography>
            <IconButton onClick={handleRefreshRooms} color="primary">
              <RefreshIcon />
            </IconButton>
          </Box>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : availableRooms.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No active rooms available. Create a new one!
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: '300px', overflowY: 'auto' }}>
              {availableRooms.map((room) => (
                <React.Fragment key={room.roomId}>
                  <ListItemButton onClick={() => navigate(`/chat/${room.roomId}`)}>
                    <ListItem>
                      <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                        {room.userCount}
                      </Avatar>
                      <ListItemText 
                        primary={`Room: ${room.roomId}`} 
                        secondary={`${room.userCount} user${room.userCount !== 1 ? 's' : ''} online`}
                        secondaryTypographyProps={{ color: '#aaa' }}
                      />
                    </ListItem>
                  </ListItemButton>
                  <Divider sx={{ bgcolor: '#333' }} />
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>

        <Dialog open={joinDialogOpen} onClose={() => setJoinDialogOpen(false)}>
          <DialogTitle>Enter Room ID</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              margin="dense"
              label="Room ID"
              value={roomIdToJoin}
              onChange={(e) => setRoomIdToJoin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setJoinDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleJoinRoom} variant="contained">Join</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default RoomSelect;