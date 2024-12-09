const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let users = {}; // Almacena usuarios conectados y sus respuestas
let finishedUsers = 0; // Conteo de usuarios que han terminado

io.on("connection", (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  // Maneja el registro de un nuevo usuario
  socket.on("join", ({ userName }) => {
    users[socket.id] = { userName, answers: [] };
    console.log(`Usuario registrado: ${userName}`);
  });

  // Maneja las respuestas de los usuarios
  socket.on("answer", ({ userName, answer }) => {
    if (users[socket.id]) {
      users[socket.id].answers.push(answer);

      // Calcula el progreso parcial entre los usuarios
      const userEntries = Object.entries(users);
      if (userEntries.length === 2) {
        const [id1, user1] = userEntries[0];
        const [id2, user2] = userEntries[1];

        const match = calculateMatch(user1.answers, user2.answers);
        io.to(id1).emit("progress", { user1: user1.userName, user2: user2.userName, match });
        io.to(id2).emit("progress", { user1: user1.userName, user2: user2.userName, match });
      }
    }
  });

  // Maneja cuando un usuario termina
  socket.on("userFinished", ({ userName }) => {
    finishedUsers++;
    console.log(`${userName} terminó. Total terminados: ${finishedUsers}`);

    const totalUsers = Object.keys(users).length;

    if (finishedUsers === totalUsers && totalUsers > 1) {
      // Cuando todos los usuarios han terminado
      const [user1, user2] = Object.values(users);
      const match = calculateMatch(user1.answers, user2.answers);
      io.emit("bothFinished"); // Notifica que todos han terminado
      io.emit("resultsReady", { user1: user1.userName, user2: user2.userName, match });
    } else {
      // Notifica que estamos esperando a más usuarios
      io.emit("waitingForOthers");
    }
  });

  // Reinicia el estado si un usuario se desconecta
  socket.on("disconnect", () => {
    console.log(`Usuario desconectado: ${socket.id}`);
    if (users[socket.id]) {
      delete users[socket.id];
      finishedUsers = Math.max(finishedUsers - 1, 0);
    }

    if (Object.keys(users).length === 0) {
      finishedUsers = 0; // Reinicia el estado si no quedan usuarios conectados
    }
  });
});

// Calcula el porcentaje de coincidencia entre respuestas
const calculateMatch = (answers1, answers2) => {
  let matches = 0;
  const total = Math.min(answers1.length, answers2.length);

  for (let i = 0; i < total; i++) {
    if (answers1[i] === answers2[i]) {
      matches++;
    }
  }

  return total > 0 ? ((matches / total) * 100).toFixed(2) : 0;
};

// Maneja rutas no específicas y sirve el cliente React
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

server.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
