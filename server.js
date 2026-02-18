import { Server } from "socket.io";

const io = new Server(3000, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("A player connected:", socket.id);

  socket.on("move", (data) => {
    // Validate movement here
    // Broadcast to others
    socket.broadcast.emit("playerMoved", { id: socket.id, pos: data.pos });
  });
});

console.log("MMO Server running on port 3000");
