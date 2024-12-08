const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());

// Sirve los archivos estáticos de React (asegúrate de construir el cliente)
app.use(express.static(path.join(__dirname, "build")));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let users = {}; // Almacena usuarios conectados y sus respuestas

io.on("connection", (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  socket.on("join", ({ userName }) => {
    users[socket.id] = { userName, answers: [] };
    console.log(`Usuario registrado: ${userName}`);
  });

  socket.on("answer", ({ userName, answer }) => {
    if (users[socket.id]) {
      users[socket.id].answers.push(answer);

      // Calcula el match parcial con el otro usuario
      const userEntries = Object.entries(users);
      if (userEntries.length === 2) {
        const [id1, user1] = userEntries[0];
        const [id2, user2] = userEntries[1];

        const match = calculateMatch(user1.answers, user2.answers);
        io.to(id1).emit("progress", match);
        io.to(id2).emit("progress", match);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`Usuario desconectado: ${socket.id}`);
    delete users[socket.id];
  });
});

// Calcula el porcentaje de coincidencia
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
