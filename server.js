const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
app.use(cors()); // Allow all origins (adjust for production)
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Change to your frontend URL in production
    methods: ["GET", "POST"]
  }
});

// In-memory storage (MVP level)
let users = {};
let sessions = {};

// Register user pseudonym (no sensitive info)
app.post('/register', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username is required" });
  if (users[username]) return res.status(400).json({ error: "Username already taken" });
  users[username] = { username };
  console.log(`User registered: ${username}`);
  res.json({ success: true });
});

// Serve privacy policy page
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacy.html'), err => {
    if (err) {
      console.error('Error sending privacy page:', err);
      res.status(500).send("Internal Server Error");
    }
  });
});

// Serve basic mental health resources
app.get('/resources', (req, res) => {
  res.json({
    resources: [
      { title: 'Coping Strategies', content: 'Breathing exercises, journaling...' },
      { title: 'Signs of Crisis', content: 'Reach out to hotlines immediately...' }
    ]
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`New socket connection: ${socket.id}`);

  socket.on('joinSession', ({ username }) => {
    if (!username || !users[username]) {
      socket.emit('errorMessage', 'User not registered.');
      return;
    }
    const sessionId = 'session1'; // Single session in this MVP
    socket.join(sessionId);
    sessions[socket.id] = { username, sessionId };
    io.to(sessionId).emit('message', { sender: 'system', text: `${username} joined the session.` });
    console.log(`${username} joined session ${sessionId}`);
  });

  socket.on('chatMessage', (msg) => {
    const session = sessions[socket.id];
    if (!session) {
      socket.emit('errorMessage', 'No active session found.');
      return;
    }
    io.to(session.sessionId).emit('message', { sender: session.username, text: msg });
    console.log(`Message from ${session.username}: ${msg}`);
  });

  socket.on('disconnect', () => {
    const session = sessions[socket.id];
    if (session && session.username && session.sessionId) {
      io.to(session.sessionId).emit('message', { sender: 'system', text: `${session.username} left the session.` });
      console.log(`User disconnected: ${session.username}`);
      delete sessions[socket.id];
    } else {
      console.log(`Socket disconnected: ${socket.id}`);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
