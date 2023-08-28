const express = require("express");
const router = express.Router();
const db = require("../db");

// Obtener todos los usuarios de una caja en específico
router.get("/:idcashPoint", async (req, res) => {
  const idcashPoint = req.params.idcashPoint;
  try {
    const users = await db.any(
      'SELECT "User".*, VirtualCashPoint.idVirtualCashPoint, VirtualCashPoint.name AS virtualCashPointName FROM "User" ' +
        'INNER JOIN VirtualCashPoint ON "User".idGlobalVirtualCashPoint = VirtualCashPoint.idGlobalVirtualCashPoint ' +
        'WHERE "User".idCashPoint = $1',
      [idcashPoint]
    );

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agregar un nuevo usuario
router.post("/", async (req, res) => {
  const { username, password, role, idCashPoint, idGlobalVirtualCashPoint } =
    req.body;
  try {
    // Obtener el valor máximo de idUser para el idCashPoint actual
    const maxIdUserResult = await db.oneOrNone(
      "SELECT maxIdUser FROM MaxUserSeq WHERE idCashPoint = $1",
      [idCashPoint]
    );

    let nextIdUser = 1;
    if (maxIdUserResult) {
      nextIdUser = maxIdUserResult.maxiduser + 1;
    }

    // Insertar el nuevo usuario
    const newUser = await db.one(
      'INSERT INTO "User" (idUser, username, password, role, idCashPoint, idGlobalVirtualCashPoint) ' +
        "VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",

      [
        nextIdUser,
        username,
        password,
        role,
        idCashPoint,
        idGlobalVirtualCashPoint,
      ]
    );

    // Actualizar o insertar el valor máximo de idUser en MaxUserSeq
    await db.none(
      "INSERT INTO MaxUserSeq (idCashPoint, maxIdUser) VALUES ($1, $2) ON CONFLICT (idCashPoint) DO UPDATE SET maxIdUser = $2",
      [idCashPoint, nextIdUser]
    );

    res.json(newUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un usuario existente
router.put("/:id", async (req, res) => {
  const id = req.params.id;
  const { username, password, role, idCashPoint, idGlobalVirtualCashPoint } =
    req.body;
  try {
    const updatedUser = await db.one(
      `UPDATE "User" SET username=$1, password=$2, role=$3, idCashPoint=$4, idGlobalVirtualCashPoint=$5
         WHERE idGlobalUser=$6 RETURNING *`,
      [username, password, role, idCashPoint, idGlobalVirtualCashPoint, id]
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
    // Obtener el idCashPoint del usuario a eliminar
    const idCashPointResult = await db.one(
      'SELECT idCashPoint FROM "User" WHERE idGlobalUser=$1',
      [id]
    );

    if (idCashPointResult) {
      const idCashPoint = idCashPointResult.idcashpoint;
      await db.none('DELETE FROM "User" WHERE idGlobalUser=$1', [id]);

      // Actualizar o eliminar el registro de MaxUserSeq según sea necesario
      const remainingUsers = await db.oneOrNone(
        'SELECT COUNT(*) AS count FROM "User" WHERE idCashPoint = $1',
        [idCashPoint]
      );

      if (remainingUsers.count === "0") {
        await db.none("DELETE FROM MaxUserSeq WHERE idCashPoint = $1", [
          idCashPoint,
        ]);
      }

      res.json({ message: "Usuario eliminado exitosamente" });
    } else {
      res.status(500).json({ error: "No se encontró el usuario" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
