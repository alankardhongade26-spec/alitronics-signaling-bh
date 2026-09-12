const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();

app.get("/", (req, res) => {
  res.send("Alitronics signaling server is running");
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const rooms = new Map();

wss.on("connection", (socket) => {
  let roomId = null;

  socket.on("message", (data) => {
    let message;

    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (message.type === "join") {
      roomId = message.room;

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
      }

      const room = rooms.get(roomId);
      room.add(socket);

      for (const peer of room) {
        if (peer !== socket && peer.readyState === WebSocket.OPEN) {
          peer.send(JSON.stringify({
            type: "peer-joined"
          }));
        }
      }

      socket.send(JSON.stringify({
        type: "joined",
        room: roomId
      }));

      return;
    }

    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    for (const peer of room) {
      if (peer !== socket && peer.readyState === WebSocket.OPEN) {
        peer.send(data.toString());
      }
    }
  });

  socket.on("close", () => {
    if (!roomId) return;

    const room = rooms.get(roomId);

    if (room) {
      room.delete(socket);

      for (const peer of room) {
        if (peer.readyState === WebSocket.OPEN) {
          peer.send(JSON.stringify({
            type: "peer-left"
          }));
        }
      }

      if (room.size === 0) {
        rooms.delete(roomId);
      }
    }
  });
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log(`Alitronics signaling server listening on port ${PORT}`);
});
