const express = require("express");
const router = express.Router();
const db = require("../db");

// Obtener todos los cajeros virtuales
router.get("/", async (req, res) => {
  try {
    const virtualCashPoints = await db.any("SELECT * FROM VirtualCashPoint");
    res.json(virtualCashPoints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agregar un nuevo cajero virtual
router.post("/", async (req, res) => {
  const { name, idCashPoint } = req.body;
  try {
    // Reiniciar la secuencia para la columna idVirtualCashPoint al valor más alto utilizado previamente
    await db.one(
      "SELECT setval('virtualcashpoint_idvirtualcashpoint_seq', COALESCE((SELECT MAX(idVirtualCashPoint) + 1 FROM VirtualCashPoint), 1), false);"
    );

    const newVirtualCashPoint = await db.one(
      "INSERT INTO VirtualCashPoint (name, idCashPoint) VALUES ($1, $2) RETURNING *",
      [name, idCashPoint]
    );
    res.json(newVirtualCashPoint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un cajero virtual
router.put("/:id", async (req, res) => {
  const id = req.params.id;
  const { name, idCashPoint } = req.body;
  try {
    const updatedVirtualCashPoint = await db.one(
      "UPDATE VirtualCashPoint SET name=$1, idCashPoint=$2 WHERE idVirtualCashPoint=$3 RETURNING *",
      [name, idCashPoint, id]
    );
    res.json(updatedVirtualCashPoint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un cajero virtual
router.delete("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    // Si se esta eliminando una caja que tiene usuarios asignados, muestra un mensaje de error ya que deberia eliminar primero los usuarios asignados a esa caja
    const users = await db.any(
      'SELECT * FROM "User" where idVirtualCashPoint=$1',
      [id]
    );

    if (users.length > 0) {
      res.json({
        message:
          "No se puede eliminar el cajero virtual porque tiene usuarios asignados. Elimine primero estos usuarios asignados",
      });
      return;
    }

    await db.none("DELETE FROM VirtualCashPoint WHERE idVirtualCashPoint=$1", [
      id,
    ]);

    res.json({ message: "Cajero virtual eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
