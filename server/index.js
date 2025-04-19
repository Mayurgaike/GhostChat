const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const PORT = process.env.PORT || 3500;

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 5e6 // 5MB max file size
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Store room data
let roomUsers = {};     // { roomId: [{ socketId, username }] }
let roomMessages = {};  // { roomId: [messageObj, ...] }
let activeRooms = new Set(); // Track active rooms

// Helper function to get available rooms
const getAvailableRooms = () => {
  return Array.from(activeRooms).map(roomId => {
    return {
      roomId,
      userCount: roomUsers[roomId]?.length || 0
    };
  });
};

io.on("connection", (socket) => {
  const userId = socket.id;
  console.log(`🔌 User connected: ${userId}`);

  // Send list of available rooms to the client
  socket.on("get-available-rooms", () => {
    socket.emit("available-rooms", getAvailableRooms());
  });

  socket.on("join-room", ({ roomId, username }) => {
    try {
      console.log(`👤 User ${username} joining room ${roomId}`);
      socket.join(roomId);
      
      // Add room to active rooms
      activeRooms.add(roomId);

      // Add user to room
      if (!roomUsers[roomId]) roomUsers[roomId] = [];
      
      // Check if user already exists in the room (for reconnections)
      const existingUserIndex = roomUsers[roomId].findIndex(u => u.username === username);
      if (existingUserIndex >= 0) {
        // Update socket ID for existing user
        roomUsers[roomId][existingUserIndex].socketId = userId;
      } else {
        // Add new user
        roomUsers[roomId].push({ socketId: userId, username });
        // Notify everyone in room about new user
        io.to(roomId).emit("user-joined", { userId, username });
      }

      // Update user list for everyone
      io.to(roomId).emit("update-user-list", roomUsers[roomId]);

      // Send chat history to newly joined user (last 100 messages)
      if (roomMessages[roomId]) {
        const history = roomMessages[roomId].slice(-100);
        socket.emit("chat-history", history);
      }
      
      // Broadcast updated room list to everyone
      io.emit("available-rooms", getAvailableRooms());
    } catch (error) {
      console.error("Error in join-room:", error);
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  socket.on("send-message", (msg) => {
    try {
      const { roomId, type } = msg;

      const messageObj = {
        ...msg,
        userId,
        timestamp: Date.now(),
        status: "sent"
      };

      if (!roomMessages[roomId]) roomMessages[roomId] = [];
      
      // Limit message history to 1000 messages per room
      if (roomMessages[roomId].length > 1000) {
        roomMessages[roomId] = roomMessages[roomId].slice(-1000);
      }
      
      roomMessages[roomId].push(messageObj);
      socket.to(roomId).emit("receive-message", messageObj);
    } catch (error) {
      console.error("Error in send-message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  socket.on("leave-room", ({ roomId, username }) => {
    try {
      console.log(`👋 User ${username} leaving room ${roomId}`);
      
      if (roomUsers[roomId]) {
        roomUsers[roomId] = roomUsers[roomId].filter(u => u.socketId !== socket.id);
        
        // If room is empty, remove it from active rooms
        if (roomUsers[roomId].length === 0) {
          activeRooms.delete(roomId);
        }
      }

      socket.leave(roomId);
      io.to(roomId).emit("user-left", { username });
      io.to(roomId).emit("update-user-list", roomUsers[roomId] || []);
      
      // Broadcast updated room list
      io.emit("available-rooms", getAvailableRooms());
    } catch (error) {
      console.error("Error in leave-room:", error);
    }
  });

  socket.on("disconnect", () => {
    try {
      console.log(`🔌 User disconnected: ${userId}`);
      
      // Find which rooms this socket was in
      for (const roomId in roomUsers) {
        const user = roomUsers[roomId].find(u => u.socketId === socket.id);
        if (user) {
          console.log(`👋 User ${user.username} disconnected from room ${roomId}`);
          
          roomUsers[roomId] = roomUsers[roomId].filter(u => u.socketId !== socket.id);
          
          // Notify room members
          io.to(roomId).emit("user-left", { username: user.username });
          io.to(roomId).emit("update-user-list", roomUsers[roomId]);
          
          // If room is empty, remove it from active rooms
          if (roomUsers[roomId].length === 0) {
            activeRooms.delete(roomId);
          }
        }
      }
      
      // Broadcast updated room list
      io.emit("available-rooms", getAvailableRooms());
    } catch (error) {
      console.error("Error in disconnect handler:", error);
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));