const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const admin = require('firebase-admin');

const app = express();
const server = http.createServer(app);

// --- FIREBASE INITIALIZATION ---
// Note: In a production environment, you should use a Service Account JSON file.
// For now, we initialize with the project ID provided.
const firebaseConfig = {
  apiKey: "AIzaSyBsssUACmo85xvCif7no6oOxU1grVe5WPQ",
  authDomain: "projectmmo-e0027.firebaseapp.com",
  projectId: "projectmmo-e0027",
  storageBucket: "projectmmo-e0027.firebasestorage.app",
  messagingSenderId: "82809636398",
  appId: "1:82809636398:web:656141c6b87013089a41bf",
  measurementId: "G-SPLCPDG59C"
};

admin.initializeApp({
  projectId: firebaseConfig.projectId
});

const db = admin.firestore();

// Essential for parsing the JSON data from your Login/Signup forms
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// --- ROOT ROUTE ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'), (err) => {
        if (err) {
            console.error("Error sending index.html. Is the file in the root directory?");
            res.status(404).send("index.html not found on server.");
        }
    });
});

// --- AUTHENTICATION ROUTES (FIREBASE) ---

app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const userRef = db.collection('users').doc(username);
        const doc = await userRef.get();

        if (doc.exists) {
            return res.status(400).json({ success: false, message: "User already exists" });
        }

        await userRef.set({
            username,
            email,
            password, // In a real app, always hash passwords before saving!
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`New user registered in Firestore: ${username} (${email})`);
        res.json({ success: true, message: "Account created in Firebase!" });
    } catch (error) {
        console.error("Signup error:", error);
        res.status(500).json({ success: false, message: "Database error" });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userRef = db.collection('users').doc(username);
        const doc = await userRef.get();

        if (doc.exists && doc.data().password === password) {
            res.json({ success: true, message: "Logged in successfully" });
        } else {
            res.status(401).json({ success: false, message: "Invalid username or password" });
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Database error" });
    }
});

// --- SOCKET.IO LOGIC ---

io.on('connection', (socket) => {
  console.log('User connected to game world:', socket.id);

  socket.on('join-game', (username) => {
      console.log(`${username} has entered the world.`);
      socket.username = username;
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
