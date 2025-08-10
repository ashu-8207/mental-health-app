// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" }
});

let users = {};
let sessions = {};

app.use(express.static(path.join(__dirname, 'public')));

app.post('/register', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });
    if (users[username]) return res.status(400).json({ error: "Username taken" });
    users[username] = { username };
    res.json({ success: true });
});

app.get('/resources', (req, res) => {
    res.json({
        resources: [
            { title: 'Breathing Techniques', content: 'Breathe in 4 seconds, hold 4, out 4...' },
            { title: 'Mental Health Hotline', content: 'Call 988 (USA Crisis Support)' },
            { title: 'You Are Not Alone', content: 'This space is safe. We’re here for you.' }
        ]
    });
});

app.get('/privacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'privacy.html'));
});

io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('joinSession', ({ username }) => {
        if (!username || !users[username]) {
            socket.emit('errorMessage', 'User not registered');
            return;
        }
        let sessionId = `session-${username}`;
        socket.join(sessionId);
        sessions[socket.id] = { username, sessionId };
        socket.emit('message', { sender: 'system', text: `Welcome ${username}, you are not alone.` });
    });

    socket.on('chatMessage', (msg) => {
        const session = sessions[socket.id];
        if (!session) return;
        io.to(session.sessionId).emit('message', { sender: session.username, text: msg });
    });

    socket.on('disconnect', () => {
        delete sessions[socket.id];
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
