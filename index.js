const express = require("express");
const { createServer } = require("http");
const { join } = require("path");
const { Server } = require("socket.io");

const app = express();
const server = createServer(app);
const io = new Server(server);
const port = 3000;

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

app.get("/channel/:channelName", (req, res) => {
  const channelName = req.params.channelName;
  res.sendFile(join(__dirname, "index.html"));
});

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("join-channel", (channelName) => {
    socket.join(channelName);
    console.log(`User joined channel: ${channelName}`);

    socket.on("send-message", (data) => {
      const { message } = data;
      io.to(channelName).emit("receive-message", {
        msg: message,
        id: socket.id,
      });
    });

    socket.on("typing", () => {
      socket
        .to(channelName)
        .emit("typing", "Quelqu'un est en train d'écrire...");
    });

    socket.on("stop-typing", () => {
      socket.to(channelName).emit("stop-typing");
    });

    socket.on("disconnect", () => {
      console.log("user disconnected");
    });
  });
});

server.listen(port, () => {
  console.log("Server is running at http://localhost:" + port);
});
