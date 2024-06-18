const express = require("express");
const { createServer } = require("node:http");
const { join } = require("node:path");
const { Server } = require("socket.io");
const app = express();
const server = createServer(app);
const io = new Server(server);
const port = 3000;

app.get("/", (req, res) => {
  res.json({ hello: "world" });
});

app.get("/hello", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("STyping", () => {
    socket.broadcast.emit("CTyping", "Quelqu'un est en train d'écrire...");
  });

  socket.on("SStopTyping", () => {
    socket.broadcast.emit("CStopTyping");
  });

  socket.on("SMessage", (message) => {
    io.emit("CMessage", { msg: message, id: socket.id });
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(port, () => {
  console.log("http://localhost:" + port + " à démarré correctement");
});
