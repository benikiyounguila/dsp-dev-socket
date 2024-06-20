const express = require("express");
const { createServer } = require("node:http");
const { join } = require("node:path");
const { Server } = require("socket.io");
const { availableParallelism } = require("node:os");
const cluster = require("node:cluster");
const { createAdapter, setupPrimary } = require("@socket.io/cluster-adapter");

// Vérification si le processus est le processus principal
if (cluster.isPrimary) {
  const numCPUs = availableParallelism(); // Obtenir le nombre de cœurs disponibles

  // Créer un processus worker pour chaque cœur disponible
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork({
      PORT: 3000 + i, // Assigner un port différent à chaque worker
    });
  }

  // Configurer l'adaptateur de cluster sur le thread principal
  return setupPrimary();
}

async function main() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    connectionStateRecovery: {}, // Options pour la récupération de l'état de connexion
    // Configurer l'adaptateur de cluster sur chaque thread worker
    adapter: createAdapter(),
  });

  // Route pour servir le fichier HTML
  app.get("/:channelName", (req, res) => {
    res.sendFile(join(__dirname, "index.html"));
  });

  // Objet pour stocker les canaux auxquels chaque socket est connectée
  var socketChannels = {};

  // Fonction pour rejoindre un canal
  function joinChannel(socket, channelName) {
    socket.join(channelName); // Rejoindre le canal
    if (!socketChannels[socket.id]) {
      socketChannels[socket.id] = [];
    }
    socketChannels[socket.id].push(channelName);
    console.log(`Socket ${socket.id} joined channel ${channelName}`);
  }

  // Fonction pour quitter un canal
  function leaveChannel(socket, channelName) {
    socket.leave(channelName); // Quitter le canal
    if (socketChannels[socket.id]) {
      let index = socketChannels[socket.id].indexOf(channelName);
      if (index !== -1) {
        socketChannels[socket.id].splice(index, 1);
      }
    }
    console.log(`Socket ${socket.id} left channel ${channelName}`);
  }

  // Fonction pour lister les canaux auxquels une socket est connectée
  function listChannels(socket) {
    if (socketChannels[socket.id]) {
      console.log(
        `Channels for socket ${socket.id}:`,
        socketChannels[socket.id]
      );
      return socketChannels[socket.id];
    } else {
      console.log(`No channels for socket ${socket.id}`);
      return [];
    }
  }

  // Fonction pour lister tous les canaux uniques
  function listAllChannels() {
    let allChannels = new Set();

    for (let id in socketChannels) {
      socketChannels[id].forEach((channel) => {
        allChannels.add(channel);
      });
    }

    let allChannelsArray = Array.from(allChannels);
    console.log("All unique channels:", allChannelsArray);
    return allChannelsArray;
  }

  // Gestionnaire d'événements pour les connexions Socket.IO
  io.on("connection", (socket) => {
    // Vérifier si un pseudo est disponible
    socket.on("SCheckPseudo", (pseudo) => {
      const usedPseudos = ["Allan"]; // Liste des pseudos déjà utilisés

      if (!usedPseudos.includes(pseudo)) {
        usedPseudos.push(pseudo);
        socket.emit("CPseudoStatus", pseudo); // Émettre un événement avec le pseudo accepté
      } else {
        socket.emit("CPseudoStatus", "error"); // Émettre un événement d'erreur
      }
    });

    // Rejoindre un canal
    socket.on("SJoin", (channelName) => {
      joinChannel(socket, channelName);

      // Quitter le canal lorsque la socket se déconnecte
      socket.on("disconnect", () => {
        console.log(`User left channel: ${channelName}`);
        leaveChannel(socket, channelName);
      });
    });

    // Lister les canaux disponibles
    socket.on("SListChannels", () => {
      let channels = listAllChannels(socket);
      socket.emit("CListChannels", channels); // Émettre un événement avec la liste des canaux
    });

    // Envoyer un message dans un canal
    socket.on("SChat", (data) => {
      io.to(data.channel).emit("CChat", {
        msg: data.msg,
        id: socket.id,
        pseudo: data.pseudo,
      }); // Émettre un événement avec le message
    });
  });

  const port = process.env.PORT; // Obtenir le port à partir de l'environnement

  server.listen(port, () => {
    console.log("server running at http://localhost:" + port);
  });
}

main();
