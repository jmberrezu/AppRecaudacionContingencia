const express = require("express");
const router = express.Router();
const db = require("../db");

// Obtener todos los cajeros virtuales
router.get("/:idcashPoint", async (req, res) => {
  const idcashPoint = req.params.idcashPoint;
  try {
    const virtualCashPoints = await db.any(
      "SELECT * FROM VirtualCashPoint WHERE idCashPoint=$1",
      idcashPoint
    );
    res.json(virtualCashPoints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agregar un nuevo cajero virtual
router.post("/", async (req, res) => {
  const { name, idCashPoint } = req.body;
  try {
    // Obtener el valor máximo de idVirtualCashPoint para el idCashPoint actual
    const maxIdVirtualCashPointResult = await db.oneOrNone(
      "SELECT maxIdVirtualCashPoint FROM MaxVirtualCashPointSeq WHERE idCashPoint = $1",
      [idCashPoint]
    );

    let nextIdVirtualCashPoint = 1;
    if (maxIdVirtualCashPointResult) {
      nextIdVirtualCashPoint =
        maxIdVirtualCashPointResult.maxidvirtualcashpoint + 1;
    }

    console.log("nextIdVirtualCashPoint: " + nextIdVirtualCashPoint);

    // Insertar el nuevo cajero virtual
    const newVirtualCashPoint = await db.one(
      "INSERT INTO VirtualCashPoint (idVirtualCashPoint, name, idCashPoint) VALUES ($1, $2, $3) RETURNING *",
      [nextIdVirtualCashPoint, name, idCashPoint]
    );

    // Actualizar o insertar el valor máximo de idVirtualCashPoint en MaxVirtualCashPointSeq
    await db.none(
      "INSERT INTO MaxVirtualCashPointSeq (idCashPoint, maxIdVirtualCashPoint) VALUES ($1, $2) ON CONFLICT (idCashPoint) DO UPDATE SET maxIdVirtualCashPoint = $2",
      [idCashPoint, nextIdVirtualCashPoint]
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
      "UPDATE VirtualCashPoint SET name=$1, idCashPoint=$2 WHERE idGlobalVirtualCashPoint=$3 RETURNING *",
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
    // Si se está eliminando un cajero que tiene usuarios asignados, muestra un mensaje de error ya que debería eliminar primero los usuarios asignados a ese cajero
    const users = await db.any(
      'SELECT * FROM "User" where idGlobalVirtualCashPoint=$1',
      [id]
    );

    if (users.length > 0) {
      res.json({
        message:
          "No se puede eliminar el cajero virtual porque tiene usuarios asignados. Elimine primero estos usuarios asignados",
      });
      return;
    }

    // Antes de eliminar, obtener el idCashPoint asociado con este cajero virtual
    const idCashPointResult = await db.oneOrNone(
      "SELECT idCashPoint FROM VirtualCashPoint WHERE idGlobalVirtualCashPoint=$1",
      [id]
    );

    if (idCashPointResult) {
      const idCashPoint = idCashPointResult.idCashPoint;

      // Eliminar el cajero virtual
      await db.none(
        "DELETE FROM VirtualCashPoint WHERE idGlobalVirtualCashPoint=$1",
        [id]
      );

      // Actualizar o eliminar el registro de MaxVirtualCashPointSeq según sea necesario
      const remainingVirtualCashPoints = await db.oneOrNone(
        "SELECT COUNT(*) FROM VirtualCashPoint WHERE idCashPoint = $1",
        [idCashPoint]
      );

      if (remainingVirtualCashPoints === 0) {
        // Si ya no quedan cajeros virtuales para este idCashPoint, eliminar el registro de MaxVirtualCashPointSeq
        await db.none(
          "DELETE FROM MaxVirtualCashPointSeq WHERE idCashPoint = $1",
          [idCashPoint]
        );
      }

      res.json({ message: "Cajero virtual eliminado exitosamente" });
    } else {
      res.status(404).json({ message: "Cajero virtual no encontrado" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
