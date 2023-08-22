const express = require("express");
const router = express.Router();
const db = require("../db");

// Obtener todos los usuarios
router.get("/", async (req, res) => {
  try {
    const users = await db.any('SELECT * FROM "User"');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agregar un nuevo usuario
router.post("/", async (req, res) => {
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
router.put("/:id", async (req, res) => {
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
router.delete("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await db.none('DELETE FROM "User" WHERE idUser=$1', [id]);
    res.json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
