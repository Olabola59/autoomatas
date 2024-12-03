const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());

// Sirve los archivos estáticos de React (solo para producción)
app.use(express.static(path.join(__dirname, "build")));

// Ruta básica para verificar el estado del servidor
app.get("/status", (req, res) => {
  res.send("Servidor corriendo correctamente");
});

// Sirve el index.html para todas las rutas no manejadas (React en producción)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// Crea el servidor HTTP
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Permitir conexiones desde cualquier origen
  },
});

const users = {}; // Almacena las respuestas de los usuarios

// Manejo de conexiones con Socket.IO
io.on("connection", (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);

  // Recibe respuestas de los usuarios
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

    // Envía los resultados al cliente actual
    socket.emit("results", { matches });
  });

  // Limpia los datos del usuario al desconectarse
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

  return ((matches / totalQuestions) * 100).toFixed(2);
};

// Inicia el servidor
server.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
