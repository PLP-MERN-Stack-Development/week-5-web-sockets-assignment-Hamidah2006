const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const users = {}; // socket.id -> username

app.use(cors());
app.get("/", (req, res) => {
  res.send("Socket.io server is running");
});

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("join", (username) => {
    users[socket.id] = username;
    io.emit("onlineUsers", Object.values(users));
    socket.broadcast.emit("userJoined", `${username} joined the chat`);
  });

  socket.on("sendMessage", ({ message, image }) => {
    const timestamp = new Date().toLocaleTimeString();
    io.emit("receiveMessage", {
      username: users[socket.id],
      message,
      image,
      timestamp,
    });
  });

  socket.on("typing", () => {
    socket.broadcast.emit("typing", users[socket.id]);
  });

  socket.on("stopTyping", () => {
    socket.broadcast.emit("stopTyping");
  });

  socket.on("reactToMessage", ({ messageIndex, reaction }) => {
    io.emit("messageReaction", {
      messageIndex,
      reaction,
      username: users[socket.id],
    });
  });

  socket.on("messageRead", ({ from, messageIndex }) => {
    const toSocketId = Object.keys(users).find((id) => users[id] === from);
    if (toSocketId) {
      io.to(toSocketId).emit("messageReadAck", {
        messageIndex,
        by: users[socket.id],
      });
    }
  });

  socket.on("privateMessage", ({ toUsername, message }) => {
    const toSocketId = Object.keys(users).find((id) => users[id] === toUsername);
    if (toSocketId) {
      io.to(toSocketId).emit("privateMessage", {
        from: users[socket.id],
        message,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  });

  socket.on("joinRoom", (roomName) => {
    socket.join(roomName);
    socket.currentRoom = roomName;
  });

  socket.on("sendMessageToRoom", ({ message }) => {
    const room = socket.currentRoom;
    const timestamp = new Date().toLocaleTimeString();
    io.to(room).emit("receiveMessage", {
      username: users[socket.id],
      message,
      timestamp,
    });
  });

  socket.on("disconnect", () => {
    const username = users[socket.id];
    delete users[socket.id];
    io.emit("userLeft", `${username} left the chat`);
    io.emit("onlineUsers", Object.values(users));
    console.log("🔴 Disconnected:", socket.id);
  });
});

server.listen(5000, () => console.log("✅ Server on http://localhost:5000"));
