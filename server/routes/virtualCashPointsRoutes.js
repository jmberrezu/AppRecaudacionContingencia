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
    await db.none("DELETE FROM VirtualCashPoint WHERE idVirtualCashPoint=$1", [
      id,
    ]);
    res.json({ message: "Cajero virtual eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
