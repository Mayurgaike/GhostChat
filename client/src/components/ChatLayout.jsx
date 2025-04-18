import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Snackbar,
  Alert,
  LinearProgress,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import js from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import html from 'react-syntax-highlighter/dist/esm/languages/hljs/xml';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

SyntaxHighlighter.registerLanguage('javascript', js);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('html', html);

const resizeImage = (file, maxWidth = 1600, maxHeight = 1200, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
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
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
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
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    const storedRoom = localStorage.getItem(`ghostchat_room_${roomId}`);
    if (storedRoom) {
      try {
        const parsedRoom = JSON.parse(storedRoom);
        if (parsedRoom.messages) setMessages(parsedRoom.messages);
      } catch (err) {
        console.error('Error parsing stored room data:', err);
      }
    }
  }, [roomId]);

  const textAreaRef = useRef(null);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      const scrollHeight = textAreaRef.current.scrollHeight;
      const maxHeight = 180;
      textAreaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [message]);

  useEffect(() => {
    const handleReceiveMessage = (msg) => setMessages((prev) => [...prev, msg]);
    const handleUserJoined = ({ username }) => {
      setMessages((prev) => [...prev, { type: 'info', message: `${username} joined the chat.`, timestamp: new Date().toISOString() }]);
    };
    const handleUserLeft = ({ username }) => {
      setMessages((prev) => [...prev, { type: 'info', message: `${username} left the chat.`, timestamp: new Date().toISOString() }]);
    };
    const handleUserList = (list) => setUsers(list);
    const handleChatHistory = (history) => {
      setMessages(history);
      setIsLoading(false);
    };
    const handleError = (err) => {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    };

    socket.on('receive-message', handleReceiveMessage);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('update-user-list', handleUserList);
    socket.on('chat-history', handleChatHistory);
    socket.on('error', handleError);
    socket.emit('join-room', { roomId, username });

    return () => {
      socket.off('receive-message', handleReceiveMessage);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('update-user-list', handleUserList);
      socket.off('chat-history', handleChatHistory);
      socket.off('error', handleError);
    };
  }, [roomId, username]);

  useEffect(() => {
    if (messages.length > 0) {
      const roomData = {
        messages: messages.slice(-100),
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(`ghostchat_room_${roomId}`, JSON.stringify(roomData));
    }
  }, [messages, roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    const msgObj = {
      roomId,
      username,
      message,
      type: 'text',
      timestamp: new Date().toISOString(),
    };
    socket.emit('send-message', msgObj);
    setMessages((prev) => [...prev, { ...msgObj, self: true }]);
    setMessage('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSending(true);
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit');
      setSending(false);
      return;
    }
    let fileData;
    if (file.type.startsWith('image/')) {
      fileData = await resizeImage(file);
    } else {
      fileData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    }
    const msg = {
      roomId,
      username,
      type: 'file',
      fileName: file.name,
      fileType: file.type,
      fileData,
      timestamp: new Date().toISOString(),
    };
    socket.emit('send-message', msg);
    setMessages((prev) => [...prev, { ...msg, self: true }]);
    setSending(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLeaveRoom = () => {
    socket.emit('leave-room', { roomId, username });
    navigate('/rooms');
  };

  const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderMessageContent = (msg) => {
    if (msg.message?.includes('```')) {
      const parts = msg.message.split(/```([a-z]*)?/g);
      return parts.map((part, i) => {
        if (i % 3 === 2) {
          const code = part.trim();
          const lang = parts[i - 1] || 'plaintext';
          return (
            <Box key={i} sx={{ position: 'relative', mb: 1 }}>
              <SyntaxHighlighter language={lang} style={atomOneDark}>
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
        return i % 3 === 0 && part ? (
          <Typography key={i} variant="body2" sx={{ color: '#eee' }}>{part}</Typography>
        ) : null;
      });
    }
    return <Typography variant="body2" sx={{ color: '#eee' }}>{msg.message}</Typography>;
  };

  return (
    <Box
      sx={{
        height: '100vh',
        background: 'linear-gradient(135deg, #0f0f0f, #1a0033)',
        display: 'flex',
        flexDirection: 'column',
        px: 2,
        py: 2,
      }}
    >
      <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{display:'flex' , alignItems: 'center', gap:1}}>
          <Box component="img" src="/User.svg" alt="User" sx={{color:'#ccc', height:'30px'}}/>
          <Box sx={{background: 'rgba(255,255,255,0.05)', p:"8px", borderRadius:1}}>
            <Typography sx={{fontSize:'12px', color:'#ccc', }}>Room Id: {roomId}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography fontSize={14} color="#ccc">{users.length} online</Typography>
          <IconButton onClick={handleLeaveRoom} sx={{ color: '#fff' }}>
          <Box component="img" src="/leave.svg" alt="Leave"/>
          </IconButton>
        </Box>
      </Box>

      <Box sx={{
        flex: 1,
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: 3,
        p: 2,
        overflowY: 'auto',
        mb: 2,
        scrollbarWidth: 'auto', // instead of 'thin'
        scrollbarColor: '#888 transparent',

        '&::-webkit-scrollbar': {
          width: '10px', // wider scrollbar
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#888',
          borderRadius: '6px',
          border: '2px solid transparent', // gives spacing
          backgroundClip: 'padding-box',    // makes border spacing visible
        },
      }}>
        {messages.map((msg, i) => (
          <Box
            key={i}
            sx={{ display: 'flex', justifyContent: msg.self ? 'flex-end' : 'flex-start', mb: 1 }}
          >
            {msg.type === 'info' ? (
              <Typography variant="caption" sx={{ color: '#aaa', width: '100%', textAlign: 'center' }}>
                [{formatTime(msg.timestamp)}] {msg.message}
              </Typography>
            ) : (
              <Box sx={{
                backgroundColor: msg.self ? '#8e24aa' : '#333',
                px: 2,
                py: 1,
                borderRadius: 2,
                maxWidth: '75%',
              }}>
                <Typography variant="caption" sx={{ color: '#ccc', mb: 0.5 }}>
                  {msg.self ? 'You' : msg.username} • {formatTime(msg.timestamp)}
                </Typography>
                {msg.type === 'text' ? renderMessageContent(msg) : (
                  <Box sx={{ mt: 1 }}>
                    {msg.fileType?.startsWith('image/') ? (
                      <Box
                        component="img"
                        src={msg.fileData}
                        alt={msg.fileName}
                        sx={{
                          maxWidth: 250,
                          maxHeight: 200,
                          borderRadius: 1,
                          cursor: 'pointer',
                          transition: '0.2s',
                          '&:hover': {
                            filter: 'brightness(1.2)',
                          },
                        }}
                        onClick={() => setPreviewImage(msg.fileData)}
                      />
                    ) : (
                      <a href={msg.fileData} download={msg.fileName} style={{ color: '#90caf9' }}>
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
      </Box>

      {/* Input */}
      <Box sx={{ display: 'flex', alignItems:'center' }}>
          <Box
            component="textarea"
            rows={1}
            ref={textAreaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Start chatting..."
            disabled={sending}
            sx={{
              flex: 1,
              resize: 'none',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #555',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              fontSize: '15px',
              outline: 'none',
              overflowY: 'auto',
              maxHeight: '180px',
              // Hide scrollbar (all browsers)
              scrollbarWidth: 'none', // Firefox
              '&::-webkit-scrollbar': {
                display: 'none', // Chrome, Safari
              },
            }}
          />
        <IconButton component="label" sx={{ color: '#fff' }} disabled={sending}>
          <AttachFileIcon />
          <input
            type="file"
            hidden
            onChange={handleFileUpload}
            accept="image/*,application/pdf"
            ref={fileInputRef}
          />
        </IconButton>
        
        <Box component="img" src="/Send.svg" alt="User" onClick={handleSend} disabled={!message.trim() || sending} sx={{color:'#ccc', height:'30px', }}/>
      </Box>

      {sending && <LinearProgress color="secondary" sx={{ mt: 1 }} />}
      {previewImage && (
        <Box
          onClick={() => setPreviewImage(null)}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'zoom-out',
          }}
        >
          <Box
            component="img"
            src={previewImage}
            alt="Preview"
            sx={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: 2,
              boxShadow: '0 0 20px rgba(255,255,255,0.2)',
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default ChatLayout;
