const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../services/verifyToken");

// Obtener todos los cajeros virtuales de una caja en específico
router.get("/:idcashPoint", verifyToken, async (req, res) => {
  // Si el usuario no es supervisor o gerente, no puede ver los cajeros virtuales
  if (req.user.role !== "supervisor" && req.user.role !== "gerente") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  const idcashPoint = req.params.idcashPoint;

  // Si el idCashPoint no es de 16 o 21 caracteres
  if (idcashPoint.length !== 16 && idcashPoint.length !== 21) {
    return res
      .status(400)
      .json({ message: "idcashPoint must be 16 or 21 characters" });
  }

  // Si no existe el idCashPoint
  const idCashPointResult = await db.oneOrNone(
    "SELECT idCashPoint FROM Supervisor WHERE idCashPoint = $1",
    [idcashPoint]
  );

  if (!idCashPointResult) {
    return res.status(400).json({ message: "idcashPoint does not exist" });
  }

  try {
    // Obtener todas las cajas virtuales de la caja
    const virtualCashPoints = await db.any(
      "SELECT * FROM VirtualCashPoint WHERE idCashPoint=$1",
      idcashPoint
    );
    res.json(virtualCashPoints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agregar una nueva caja virtual
router.post("/", verifyToken, async (req, res) => {
  // Si el rol no es supervisor, no puede agregar cajas virtuales
  if (req.user.role !== "supervisor") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  const { name, idCashPoint } = req.body;

  // Si no se recibe el idCashPoint
  if (!idCashPoint) {
    return res.status(400).json({ message: "idCashPoint required" });
  } else {
    // Si el idCashPoint no es de 16 o 21 caracteres
    if (idCashPoint.length !== 16 && idCashPoint.length !== 21) {
      return res
        .status(400)
        .json({ message: "idCashPoint must be 16 or 21 characters" });
    }
  }
  try {
    await db.tx(async (transaction) => {
      // Si el idCashPoint no existe
      const idCashPointResult = await transaction.oneOrNone(
        "SELECT idCashPoint FROM Supervisor WHERE idCashPoint = $1",
        [idCashPoint]
      );

      if (!idCashPointResult) {
        return res.status(400).json({ message: "idCashPoint does not exist" });
      }

      // Si no se recibe el nombre
      if (!name) {
        return res.status(400).json({ message: "name required" });
      } else {
        // Si el nombre no es de 2 a 50 caracteres
        if (name.length < 1 || name.length > 50) {
          return res
            .status(400)
            .json({ message: "name must be 1 to 50 characters" });
        }
      }

      // Obtener el valor máximo de idVirtualCashPoint para el idCashPoint actual
      const maxIdVirtualCashPointResult = await transaction.oneOrNone(
        "SELECT maxIdVirtualCashPoint FROM MaxVirtualCashPointSeq WHERE idCashPoint = $1",
        [idCashPoint]
      );

      let nextIdVirtualCashPoint = 1;
      if (maxIdVirtualCashPointResult) {
        nextIdVirtualCashPoint =
          maxIdVirtualCashPointResult.maxidvirtualcashpoint + 1;
      }

      // Si el valor máximo de idVirtualCashPoint supera el límite de 99 cajas, se ha superado el límite de cajas virtuales para este idCashPoint
      if (nextIdVirtualCashPoint > 99) {
        return res.status(400).json({
          message:
            "Max number of virtual cashpoints reached for this cashpoint",
        });
      }

      // Insertar el nuevo cajero virtual
      const newVirtualCashPoint = await transaction.one(
        "INSERT INTO VirtualCashPoint (idVirtualCashPoint, name, idCashPoint) VALUES ($1, $2, $3) RETURNING *",
        [nextIdVirtualCashPoint, name, idCashPoint]
      );

      // Actualizar o insertar el valor máximo de idVirtualCashPoint en MaxVirtualCashPointSeq
      await transaction.none(
        "INSERT INTO MaxVirtualCashPointSeq (idCashPoint, maxIdVirtualCashPoint) VALUES ($1, $2) ON CONFLICT (idCashPoint) DO UPDATE SET maxIdVirtualCashPoint = $2",
        [idCashPoint, nextIdVirtualCashPoint]
      );

      // Agregar una entrada en la tabla de bitácora ("log")
      await transaction.none(
        "INSERT INTO log (username, action, description, timestamp) VALUES ($1, $2, $3, $4)",
        [
          req.user.username,
          "Agregar Cajero Virtual",
          `El supervisor ${req.user.username} agregó el cajero virtual ${newVirtualCashPoint.idvirtualcashpoint} a la caja ${idCashPoint}`,
          new Date(),
        ]
      );

      res.json(newVirtualCashPoint);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un cajero virtual
router.put("/:id", verifyToken, async (req, res) => {
  // Si el rol no es supervisor, no puede actualizar cajas virtuales
  if (req.user.role !== "supervisor") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  const id = req.params.id;
  const { name, idCashPoint } = req.body;

  // Si el id no es un numero
  if (isNaN(id)) {
    return res.status(400).json({ message: "id must be a number" });
  }
  try {
    await db.tx(async (transaction) => {
      // Si el id no existe
      const idVirtualCashPointResult = await transaction.oneOrNone(
        "SELECT idGlobalVirtualCashPoint FROM VirtualCashPoint WHERE idGlobalVirtualCashPoint = $1",
        [id]
      );

      if (!idVirtualCashPointResult) {
        return res.status(400).json({ message: "id does not exist" });
      }

      // Si no se recibe el idCashPoint
      if (!idCashPoint) {
        return res.status(400).json({ message: "idCashPoint required" });
      } else {
        // Si el idCashPoint no es de 16 o 21 caracteres
        if (idCashPoint.length !== 16 && idCashPoint.length !== 21) {
          return res
            .status(400)
            .json({ message: "idCashPoint must be 16 or 21 characters" });
        }
      }

      // Si el idCashPoint no existe
      const idCashPointResult = await transaction.oneOrNone(
        "SELECT idCashPoint FROM Supervisor WHERE idCashPoint = $1",
        [idCashPoint]
      );

      if (!idCashPointResult) {
        return res.status(400).json({ message: "idCashPoint does not exist" });
      }

      // Si no se recibe el nombre
      if (!name) {
        return res.status(400).json({ message: "name required" });
      } else {
        // Si el nombre no es de 2 a 50 caracteres
        if (name.length < 1 || name.length > 50) {
          return res
            .status(400)
            .json({ message: "name must be 1 to 50 characters" });
        }
      }

      const updatedVirtualCashPoint = await transaction.one(
        "UPDATE VirtualCashPoint SET name=$1, idCashPoint=$2 WHERE idGlobalVirtualCashPoint=$3 RETURNING *",
        [name, idCashPoint, id]
      );

      // Agregar una entrada en la tabla de bitácora ("log")
      await transaction.none(
        "INSERT INTO log (username, action, description, timestamp) VALUES ($1, $2, $3, $4)",
        [
          req.user.username,
          "Actualizar Cajero Virtual",
          `El supervisor ${req.user.username} actualizó el cajero virtual ${updatedVirtualCashPoint.idvirtualcashpoint} de la caja ${idCashPoint}`,
          new Date(),
        ]
      );

      res.json(updatedVirtualCashPoint);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un cajero virtual
router.delete("/:id", verifyToken, async (req, res) => {
  // Si el rol no es supervisor, no puede eliminar cajas virtuales
  if (req.user.role !== "supervisor") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  const id = req.params.id;

  // Si el id no es un numero
  if (isNaN(req.params.id)) {
    return res.status(400).json({ message: "id must be a number" });
  }

  try {
    await db.tx(async (transaction) => {
      // Si el id no existe y obtiene el idCashPoint del cajero virtual a eliminar
      const idVirtualCashPointResult = await transaction.oneOrNone(
        "SELECT idGlobalVirtualCashPoint, idCashPoint FROM VirtualCashPoint WHERE idGlobalVirtualCashPoint = $1",
        [id]
      );

      if (!idVirtualCashPointResult) {
        return res.status(400).json({ message: "id does not exist" });
      }

      // Si se está eliminando un cajero que tiene usuarios asignados, muestra un mensaje de error ya que debería eliminar primero los usuarios asignados a ese cajero
      const users = await transaction.any(
        'SELECT * FROM "User" where idGlobalVirtualCashPoint=$1',
        [id]
      );

      if (users.length > 0) {
        return res.status(400).json({
          message:
            "No se puede eliminar este cajero virtual porque tiene usuarios asignados",
        });
      }

      // Si se está eliminando un cajero que tiene pagos o pagos reversos asignados, muestra un mensaje de error ya que debería eliminar primero los pagos o pagos reversos asignados a ese cajero
      const counts = await transaction.one(
        "SELECT (SELECT COUNT(*) FROM Payment WHERE idGlobalVirtualCashPoint=$1) AS payments",
        [id]
      );

      if (counts.payments > 0) {
        return res.status(400).json({
          message:
            "No se puede eliminar este cajero virtual porque tiene pagos o pagos reversos asignados",
        });
      }

      // Eliminar el cajero virtual
      await transaction.none(
        "DELETE FROM VirtualCashPoint WHERE idGlobalVirtualCashPoint=$1",
        [id]
      );

      // Actualizar o eliminar el registro de MaxVirtualCashPointSeq según sea necesario
      const remainingVirtualCashPoints = await transaction.oneOrNone(
        "SELECT COUNT(*) FROM VirtualCashPoint WHERE idCashPoint = $1",
        [idVirtualCashPointResult.idcashpoint]
      );

      if (remainingVirtualCashPoints.count === "0") {
        // Si ya no quedan cajeros virtuales para este idCashPoint, eliminar el registro de MaxVirtualCashPointSeq
        await transaction.none(
          "DELETE FROM MaxVirtualCashPointSeq WHERE idCashPoint = $1",
          [idVirtualCashPointResult.idcashpoint]
        );
      }

      // Agregar una entrada en la tabla de bitácora ("log")
      await transaction.none(
        "INSERT INTO log (username, action, description, timestamp) VALUES ($1, $2, $3, $4)",
        [
          req.user.username,
          "Eliminar Cajero Virtual",
          `El supervisor ${req.user.username} eliminó el cajero virtual ${idVirtualCashPointResult.idglobalvirtualcashpoint} de la caja ${idVirtualCashPointResult.idcashpoint}`,
          new Date(),
        ]
      );

      res.json({ message: "Virtual Cashpoint deleted succesfully" });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
