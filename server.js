const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const admin = require('firebase-admin');

const app = express();
const server = http.createServer(app);

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  projectId: "projectmmo-e0027"
};

try {
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId: firebaseConfig.projectId
        });
        console.log("Firebase Admin initialized successfully.");
    }
} catch (e) {
    console.error("Firebase initialization failed:", e);
}

const db = admin.firestore();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// --- ROUTES ---

// Authentication logic (POST)
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
        return res.status(400).json({ success: false, message: "All fields are required." });
    }

    try {
        console.log(`Attempting signup for: ${username}`);
        const userRef = db.collection('users').doc(username);
        const doc = await userRef.get();

        if (doc.exists) {
            return res.status(400).json({ success: false, message: "Username already taken." });
        }

        await userRef.set({
            username,
            email,
            password, 
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: "Account created!" });
    } catch (error) {
        console.error("FIREBASE ERROR:", error.message);
        res.status(500).json({ 
            success: false, 
            message: "Database Error: " + error.message 
        });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userRef = db.collection('users').doc(username);
        const doc = await userRef.get();

        if (doc.exists && doc.data().password === password) {
            res.json({ success: true, message: "Welcome back!" });
        } else {
            res.status(401).json({ success: false, message: "Invalid credentials." });
        }
    } catch (error) {
        console.error("LOGIN ERROR:", error.message);
        res.status(500).json({ success: false, message: "Login failed." });
    }
});

// Wildcard Route (GET)
// This ensures that visiting /login or refreshing the page returns index.html
// instead of a "Cannot GET" error.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- SOCKETS ---
io.on('connection', (socket) => {
  socket.on('join-game', (username) => {
      socket.username = username;
      socket.broadcast.emit('player-joined', { id: socket.id, name: username });
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
