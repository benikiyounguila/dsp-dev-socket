const express = require("express");
const http = require("http");
const path = require("path");

const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

io.on("connection", (socket) => {
  console.log("Un utilisateur s'est connecté");

  socket.on("disconnect", () => {
    console.log("Un utilisateur s'est déconnecté");
  });
});



app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

server.listen(3000, () => {
  console.log("Serveur démarré sur le port 3000");
});
