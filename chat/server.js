import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { join } from "path";
import { fileURLToPath } from "url";
import multer from 'multer';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");

const app = express();
const server = createServer(app);
const io = new Server(server);

// Setup multer for simple file uploads to ./public/uploads with limits
const __dirname2 = dirname(fileURLToPath(import.meta.url));
const uploadDir = join(__dirname2, 'public', 'uploads');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_'));
  }
});
// Allow only common safe types and limit file size to 5MB
const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'application/pdf', 'text/plain']);
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMES.has(file.mimetype)) return cb(new Error('Invalid file type'), false);
    cb(null, true);
  }
});

const PORT = process.env.PORT || 3000;

let activeUsers = {};
let usernamesSet = new Set();
// rooms map: roomName -> { private: bool, owner: username|null, inviteCode: string|null }
let rooms = new Map();
// seed some public rooms
['General', 'Sports', 'Tech'].forEach(r => rooms.set(r, { private: false, owner: null, inviteCode: null }));
// track members per room
let roomMembers = {}; // { roomName: Set(socketId) }

// Simple per-socket rate limiting (messages per interval)
const MESSAGE_LIMIT = 10; // messages
const MESSAGE_WINDOW_MS = 10 * 1000; // per 10s
const socketMessageBuckets = new Map(); // socket.id -> { count, windowStart }

// Serve static files from the "public" directory
app.use(express.static(join(__dirname, "public")));

// Root route
app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

// File upload endpoint (multipart/form-data)
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false });
  // Return public path to uploaded file
  const publicPath = `/uploads/${req.file.filename}`;
  res.json({ success: true, path: publicPath, name: req.file.originalname, mime: req.file.mimetype });
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  // initialize rate bucket
  socketMessageBuckets.set(socket.id, { count: 0, windowStart: Date.now() });

  let currentRoom = null;

  // Send current room list to newly connected client
  // only expose public rooms
  const publicRooms = Array.from(rooms.entries()).filter(([name, meta]) => !meta.private).map(([name]) => name);
  socket.emit('roomList', publicRooms);

  // Handle user joining
  socket.on("setUsername", (username, callback) => {
    if (usernamesSet.has(username)) {
      callback({ success: false, message: 'Username already taken' });
      return;
    }

    activeUsers[socket.id] = username;
    usernamesSet.add(username);
    // update any existing room membership tracking
    // (room membership is added on joinRoom below)
    callback({ success: true });
    console.log(`Username set: ${username}`);
  });

  socket.on('joinRoom', (roomName) => {
    // Only allow joining existing public rooms via this event
    if (!roomName || !rooms.has(roomName)) {
      socket.emit('systemMessage', 'Room does not exist');
      return;
    }
    const meta = rooms.get(roomName);
    if (meta.private) {
      // private rooms must be joined via invite or by owner
      const username = activeUsers[socket.id];
      if (!username || meta.owner !== username) {
        socket.emit('systemMessage', 'This room is private. Join via invite.');
        return;
      }
    }
    if (currentRoom) {
      socket.leave(currentRoom);
      socket.to(currentRoom).emit('systemMessage', `${activeUsers[socket.id]} left the room`);
      // remove from previous roomMembers
      if (roomMembers[currentRoom]) roomMembers[currentRoom].delete(socket.id);
      io.to(currentRoom).emit('memberList', Array.from((roomMembers[currentRoom] || [])).map(id => activeUsers[id]).filter(Boolean));
    }
    socket.join(roomName);
    currentRoom = roomName;
    // track members
    roomMembers[roomName] = roomMembers[roomName] || new Set();
    roomMembers[roomName].add(socket.id);
    // broadcast member list to room
    io.to(roomName).emit('memberList', Array.from((roomMembers[roomName] || [])).map(id => activeUsers[id]).filter(Boolean));
    socket.to(roomName).emit('systemMessage', `${activeUsers[socket.id]} joined the room`);
    socket.emit('systemMessage', `You joined ${roomName}`);
  });

  // Join a private room via invite code
  socket.on('joinWithInvite', (inviteCode, callback) => {
    if (!inviteCode) {
      if (typeof callback === 'function') callback({ success: false, message: 'Invite code required' });
      return;
    }
    const found = Array.from(rooms.entries()).find(([name, meta]) => meta.inviteCode === inviteCode);
    if (!found) {
      if (typeof callback === 'function') callback({ success: false, message: 'Invalid invite code' });
      return;
    }
    const [roomName, meta] = found;
    // join the room (reuse join logic but bypass private check since invite valid)
    if (currentRoom) {
      socket.leave(currentRoom);
      socket.to(currentRoom).emit('systemMessage', `${activeUsers[socket.id]} left the room`);
      if (roomMembers[currentRoom]) roomMembers[currentRoom].delete(socket.id);
      io.to(currentRoom).emit('memberList', Array.from((roomMembers[currentRoom] || [])).map(id => activeUsers[id]).filter(Boolean));
    }
    socket.join(roomName);
    currentRoom = roomName;
    roomMembers[roomName] = roomMembers[roomName] || new Set();
    roomMembers[roomName].add(socket.id);
    io.to(roomName).emit('memberList', Array.from((roomMembers[roomName] || [])).map(id => activeUsers[id]).filter(Boolean));
    socket.to(roomName).emit('systemMessage', `${activeUsers[socket.id]} joined the room`);
    socket.emit('systemMessage', `You joined ${roomName}`);
    if (typeof callback === 'function') callback({ success: true, room: roomName });
  });

  // Typing indicator events
  socket.on('typing', () => {
    if (currentRoom) socket.to(currentRoom).emit('typing', { user: activeUsers[socket.id] });
  });
  socket.on('stopTyping', () => {
    if (currentRoom) socket.to(currentRoom).emit('stopTyping', { user: activeUsers[socket.id] });
  });

  // File share event (server just relays a file message object to the room)
  socket.on('fileShared', (fileMeta) => {
    if (!currentRoom || !activeUsers[socket.id]) return;
    socket.to(currentRoom).emit('fileShared', {
      username: activeUsers[socket.id],
      ...fileMeta,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  // Allow clients to create a new room
  socket.on('createRoom', (roomName, callback) => {
    const clean = (roomName || '').trim();
    if (!clean) {
      if (typeof callback === 'function') callback({ success: false, message: 'Room name required' });
      return;
    }
    if (rooms.has(clean)) {
      if (typeof callback === 'function') callback({ success: false, message: 'Room already exists' });
      return;
    }
    // generate a short invite code
    const inviteCode = Math.random().toString(36).slice(2, 9).toUpperCase();
    const owner = activeUsers[socket.id] || null;
    rooms.set(clean, { private: true, owner, inviteCode });
    roomMembers[clean] = new Set();
    // broadcast updated list (only public rooms) to everyone
    const publicRooms = Array.from(rooms.entries()).filter(([name, meta]) => !meta.private).map(([name]) => name);
    io.emit('roomList', publicRooms);
    if (typeof callback === 'function') callback({ success: true, inviteCode });
  });

  socket.on("chatMessage", (message) => {
    if (!currentRoom || !activeUsers[socket.id]) return;
    // server-side message length limit
    const MAX_MESSAGE_LEN = 2000;
    let cleanMessage = String(message || '').trim().slice(0, MAX_MESSAGE_LEN);
    if (!cleanMessage) return; // prevent empty messages

    // rate limiting
    const bucket = socketMessageBuckets.get(socket.id) || { count: 0, windowStart: Date.now() };
    const now = Date.now();
    if (now - bucket.windowStart > MESSAGE_WINDOW_MS) {
      bucket.count = 0;
      bucket.windowStart = now;
    }
    bucket.count += 1;
    socketMessageBuckets.set(socket.id, bucket);
    if (bucket.count > MESSAGE_LIMIT) {
      // notify sender that they're sending too fast
      socket.emit('systemMessage', 'You are sending messages too quickly — slow down.');
      return;
    }

    socket.to(currentRoom).emit("chatMessage", {
      username: activeUsers[socket.id],
      text: cleanMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });

  socket.on("disconnect", () => {
    console.log('A user disconnected:', socket.id);

    const username = activeUsers[socket.id];
    if (username) {
      usernamesSet.delete(username);
      delete activeUsers[socket.id];
      // remove from any roomMembers sets and notify those rooms
      Object.keys(roomMembers).forEach(r => {
        if (roomMembers[r].has(socket.id)) {
          roomMembers[r].delete(socket.id);
          io.to(r).emit('memberList', Array.from(roomMembers[r]).map(id => activeUsers[id]).filter(Boolean));
          socket.to(r).emit('systemMessage', `${username} disconnected`);
        }
      });
    }
    socketMessageBuckets.delete(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});