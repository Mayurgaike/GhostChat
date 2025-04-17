import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  IconButton,
  Snackbar,
  Alert,
  LinearProgress,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import js from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import html from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

// Register languages
SyntaxHighlighter.registerLanguage('javascript', js);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('html', html);

// Helper function to resize an image for optimized transmission
const resizeImage = (file, maxWidth = 1600, maxHeight = 1200, quality = 0.7) => {
  return new Promise((resolve) => {
    // Create a FileReader to read the image
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        // Create a canvas for resizing
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Draw and resize image on canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get resized image as DataURL
        const resizedImageData = canvas.toDataURL('image/jpeg', quality);
        resolve(resizedImageData);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const ChatLayout = ({ username }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check if we have a stored room state and restore it
  useEffect(() => {
    const storedRoom = localStorage.getItem(`ghostchat_room_${roomId}`);
    if (storedRoom) {
      try {
        const parsedRoom = JSON.parse(storedRoom);
        if (parsedRoom.messages && Array.isArray(parsedRoom.messages)) {
          setMessages(parsedRoom.messages);
        }
      } catch (err) {
        console.error('Error parsing stored room data:', err);
      }
    }
  }, [roomId]);

  // Join the room when component mounts
  useEffect(() => {
    // Set up socket listeners BEFORE joining the room
    const handleReceiveMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };
    
    const handleUserJoined = ({ username }) => {
      setMessages((prev) => [
        ...prev,
        {
          type: 'info',
          message: `${username} joined the chat.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };
    
    const handleUserLeft = ({ username }) => {
      setMessages((prev) => [
        ...prev,
        {
          type: 'info',
          message: `${username} left the chat.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };
    
    const handleUserList = (list) => {
      setUsers(list);
    };
    
    const handleChatHistory = (history) => {
      setMessages(history);
      setIsLoading(false);
    };

    const handleError = (err) => {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    };
    
    // Add event listeners
    socket.on('receive-message', handleReceiveMessage);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('update-user-list', handleUserList);
    socket.on('chat-history', handleChatHistory);
    socket.on('error', handleError);
    
    // Now join the room
    socket.emit('join-room', { roomId, username });
    
    // CLEANUP: Remove event listeners and leave room
    return () => {
      socket.off('receive-message', handleReceiveMessage);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('update-user-list', handleUserList);
      socket.off('chat-history', handleChatHistory);
      socket.off('error', handleError);
    };
  }, [roomId, username]);
  
  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      const roomData = {
        messages: messages.slice(-100), // Store last 100 messages only
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(`ghostchat_room_${roomId}`, JSON.stringify(roomData));
    }
  }, [messages, roomId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;

    const timestamp = new Date().toISOString();
    const msgObj = {
      roomId,
      username,
      message,
      type: 'text',
      timestamp,
    };

    socket.emit('send-message', msgObj);
    setMessages((prev) => [...prev, { ...msgObj, self: true }]);
    setMessage('');
  };

  const handleFileUpload = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      
      setSending(true);
      
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size exceeds 5MB limit');
        setSending(false);
        return;
      }
      
      let fileData;
      
      // Process images differently
      if (file.type.startsWith('image/')) {
        fileData = await resizeImage(file);
      } else {
        // For other files, read as data URL
        fileData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      }
      
      const timestamp = new Date().toISOString();
      const msg = {
        roomId,
        username,
        type: 'file',
        fileName: file.name,
        fileType: file.type,
        fileData,
        timestamp,
      };
      
      socket.emit('send-message', msg);
      setMessages((prev) => [...prev, { ...msg, self: true }]);
      setSending(false);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file');
      setSending(false);
    }
  };

  const handleLeaveRoom = () => {
    socket.emit('leave-room', { roomId, username });
    navigate('/rooms');
  };

  const formatTime = (isoTime) => {
    const date = new Date(isoTime);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessageContent = (msg) => {
    // Handle code blocks with or without specified language
    if (msg.message && typeof msg.message === 'string' && msg.message.includes('```')) {
      // Split the message by code block markers
      const parts = msg.message.split(/```([a-z]*)?/g);
      const result = [];
      
      for (let i = 0; i < parts.length; i++) {
        if (i % 3 === 0) {
          // Regular text part
          if (parts[i]) {
            result.push(
              <Typography key={`text-${i}`} variant="body1" sx={{ color: '#fff', mb: 1 }}>
                {parts[i]}
              </Typography>
            );
          }
        } else if (i % 3 === 1) {
          // Language specifier (might be empty)
          // Skip this part, we'll use it in the next iteration
        } else {
          // Code content
          const code = parts[i].trim();
          const language = parts[i-1] || 'plaintext'; // Use the language specifier or default to plaintext
          
          result.push(
            <Box key={`code-${i}`} sx={{ position: 'relative', mb: 2 }}>
              <SyntaxHighlighter language={language} style={atomOneDark}>
                {code}
              </SyntaxHighlighter>
              <IconButton
                size="small"
                sx={{ position: 'absolute', top: 8, right: 8, color: '#ccc' }}
                onClick={() => navigator.clipboard.writeText(code)}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>
          );
        }
      }
      
      return result.length > 0 ? result : <Typography variant="body1" sx={{ color: '#fff' }}>{msg.message}</Typography>;
    }
    
    // Regular text message
    return <Typography variant="body1" sx={{ color: '#fff' }}>{msg.message}</Typography>;
  };

  return (
    <Box
      sx={{
        height: '100vh',
        backgroundColor: '#0e0e0e',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        p: { xs: 2, sm: 3 },
      }}
    >
      {/* Progress bar for loading */}
      {isLoading && <LinearProgress color="secondary" />}
      
      {/* Error snackbar */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      
      {/* Header */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton color="inherit" onClick={handleLeaveRoom} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6">Room: {roomId}</Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle1">{users.length} online</Typography>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={handleLeaveRoom}
          >
            Leave
          </Button>
        </Stack>
      </Box>

      {/* Online Users List */}
      <Box sx={{ mb: 2 }}>
        {users.length > 0 && (
          <Typography variant="body2" sx={{ color: '#aaa' }}>
            Online: {users.map((u) => u.username).join(', ')}
          </Typography>        
        )}
      </Box>

      {/* Messages Area */}
      <Paper
        sx={{
          flex: 1,
          backgroundColor: '#1f1f1f',
          p: 2,
          overflowY: 'auto',
          borderRadius: 2,
          mb: 2,
        }}
      >
        {messages.length === 0 && !isLoading ? (
          <Typography variant="body2" sx={{ color: '#aaa', textAlign: 'center', mt: 4 }}>
            No messages yet. Start the conversation!
          </Typography>
        ) : (
          <Stack spacing={1}>
            {messages.map((msg, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  justifyContent: msg.self ? 'flex-end' : 'flex-start',
                }}
              >
                {msg.type === 'info' ? (
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#aaa',
                      fontStyle: 'italic',
                      textAlign: 'center',
                      width: '100%',
                    }}
                  >
                    [{formatTime(msg.timestamp)}] {msg.message}
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      backgroundColor: msg.self ? '#8e24aa' : '#333',
                      borderRadius: 2,
                      px: 2,
                      py: 1,
                      maxWidth: '75%',
                      wordBreak: 'break-word',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#bbb' }}>
                      {msg.self ? 'You' : msg.username} • {formatTime(msg.timestamp)}
                    </Typography>
                    {msg.type === 'text' ? (
                      renderMessageContent(msg)
                    ) : (
                      <Box sx={{ mt: 1 }}>
                        {msg.fileType?.startsWith('image/') ? (
                          <img
                            src={msg.fileData}
                            alt={msg.fileName}
                            style={{
                              maxWidth: '100%',
                              borderRadius: 8,
                              marginTop: 5,
                            }}
                          />
                        ) : (
                          <a
                            href={msg.fileData}
                            download={msg.fileName}
                            style={{
                              color: '#90caf9',
                              textDecoration: 'underline',
                            }}
                          >
                            {msg.fileName}
                          </a>
                        )}
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Stack>
        )}
      </Paper>

      {/* Input Section */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          fullWidth
          placeholder="Type your message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          multiline
          maxRows={3}
          sx={{ backgroundColor: '#fff', borderRadius: 1 }}
          size="small"
          disabled={sending}
        />
        <IconButton 
          component="label" 
          sx={{ color: '#fff' }}
          disabled={sending}
        >
          <AttachFileIcon />
          <input
            type="file"
            hidden
            onChange={handleFileUpload}
            accept="image/*,application/pdf"
            ref={fileInputRef}
          />
        </IconButton>
        <Button
          variant="contained"
          onClick={handleSend}
          sx={{ textTransform: 'none' }}
          disabled={sending || !message.trim()}
        >
          Send
        </Button>
      </Box>
      
      {/* Upload progress indicator */}
      {sending && <LinearProgress color="secondary" sx={{ mt: 1 }} />}
    </Box>
  );
};

export default ChatLayout;