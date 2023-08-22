const express = require("express");
const cors = require("cors");
const app = express();
const port = 5000; // Puedes cambiar el puerto si es necesario

const db = require("./db"); // Configuración de la base de datos

app.use(cors());
app.use(express.json());

// Obtener todos los usuarios
app.get("/api/users", async (req, res) => {
  try {
    const users = await db.any('SELECT * FROM "User"');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agregar un nuevo usuario
app.post("/api/users", async (req, res) => {
  const { username, password, role, idCashPoint, idVirtualCashPoint } =
    req.body;
  try {
    const newUser = await db.one(
      `INSERT INTO "User" (username, password, role, idCashPoint, idVirtualCashPoint)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [username, password, role, idCashPoint, idVirtualCashPoint]
    );
    res.json(newUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un usuario existente
app.put("/api/users/:id", async (req, res) => {
  const id = req.params.id;
  const { username, password, role, idCashPoint, idVirtualCashPoint } =
    req.body;
  try {
    const updatedUser = await db.one(
      `UPDATE "User" SET username=$1, password=$2, role=$3, idCashPoint=$4, idVirtualCashPoint=$5
       WHERE idUser=$6 RETURNING *`,
      [username, password, role, idCashPoint, idVirtualCashPoint, id]
    );
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un usuario
app.delete("/api/users/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await db.none('DELETE FROM "User" WHERE idUser=$1', [id]);
    res.json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un usuario existente
app.put("/api/users/:id", async (req, res) => {
  console.log(req.body);
  const id = req.params.id;
  const { username, role, idCashPoint, idVirtualCashPoint } = req.body;
  try {
    const updatedUser = await db.one(
      `UPDATE "User" SET username=$1, role=$2, idCashPoint=$3, idVirtualCashPoint=$4
           WHERE iduser=$5 RETURNING *`,
      [username, role, idCashPoint, idVirtualCashPoint, id]
    );
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener todos los cajeros virtuales
app.get("/api/virtualcashpoints", async (req, res) => {
  try {
    const virtualCashPoints = await db.any("SELECT * FROM VirtualCashPoint");
    res.json(virtualCashPoints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor Express escuchando en el puerto ${port}`);
});
