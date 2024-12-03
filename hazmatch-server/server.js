const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permitir conexiones desde cualquier origen
  },
});

const users = {}; // Almacena las respuestas de los usuarios

io.on("connection", (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  // Recibe las respuestas del usuario
  socket.on("submitAnswers", ({ userName, answers }) => {
    users[socket.id] = { userName, answers };

    // Calcula el porcentaje de match con otros usuarios
    const matches = [];
    for (const [id, user] of Object.entries(users)) {
      if (id !== socket.id) {
        const match = calculateMatch(user.answers, answers);
        matches.push({ userName: user.userName, match });
      }
    }

    // Enviar los resultados al cliente
    socket.emit("results", { matches });
  });

  socket.on("disconnect", () => {
    console.log(`Usuario desconectado: ${socket.id}`);
    delete users[socket.id];
  });
});

// Función para calcular el porcentaje de coincidencia
const calculateMatch = (answers1, answers2) => {
  let matches = 0;
  let totalQuestions = 0;

  // Recorre las respuestas de cada categoría y pregunta
  answers1.forEach((category, categoryIndex) => {
    category.forEach((answer, questionIndex) => {
      totalQuestions++;
      if (answer === answers2[categoryIndex][questionIndex] && answer !== "") {
        matches++;
      }
    });
  });

  // Calcula el porcentaje de coincidencia
  return ((matches / totalQuestions) * 100).toFixed(2);
};

server.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
