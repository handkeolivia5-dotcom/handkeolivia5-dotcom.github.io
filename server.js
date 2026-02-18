const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Essential for parsing the JSON data from your Login/Signup forms
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (like index.html, css, client-side js) from the root directory
// Using path.join helps avoid issues with relative paths on different operating systems
app.use(express.static(path.join(__dirname)));

// Temporary in-memory database (Resets when server restarts)
const users = {}; 

const PORT = process.env.PORT || 3000;

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// --- ROOT ROUTE ---
// This explicitly sends the index.html file. 
// If this still fails, ensure index.html is in the SAME folder as server.js on GitHub.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'), (err) => {
        if (err) {
            console.error("Error sending index.html. Is the file in the root directory?");
            res.status(404).send("index.html not found on server.");
        }
    });
});

// --- AUTHENTICATION ROUTES ---

app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    if (users[username]) {
        return res.status(400).json({ success: false, message: "User already exists" });
    }
    users[username] = { password, id: Math.random().toString(36).substr(2, 9) };
    console.log(`New user registered: ${username}`);
    res.json({ success: true, message: "Account created!" });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users[username];
    if (user && user.password === password) {
        res.json({ success: true, message: "Logged in successfully" });
    } else {
        res.status(401).json({ success: false, message: "Invalid username or password" });
    }
});

// --- SOCKET.IO LOGIC ---

io.on('connection', (socket) => {
  console.log('User connected to game world:', socket.id);

  // Handle player joining after server selection
  socket.on('join-game', (username) => {
      console.log(`${username} has entered the world.`);
      // You can store the username on the socket for later use
      socket.username = username;
      // Broadcast to others that a player joined
      socket.broadcast.emit('player-joined', { id: socket.id, name: username });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`MMO Server live on port ${PORT}`);
  console.log(`Searching for index.html in: ${path.join(__dirname, 'index.html')}`);
});
