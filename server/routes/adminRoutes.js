const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const verifyToken = require("./verifyToken");

router.post("/", async (req, res) => {
  const { username, password } = req.body;

  // Busca usuario en la base de datos
  const user = await db.oneOrNone('SELECT * FROM Admin WHERE "user" = $1', [
    username,
  ]);

  if (!user) {
    // Si el usuario no existe
    return res.status(401).json({ message: "Usuario no Encontrado." });
  } else {
    if (!(await bcrypt.compare(password, user.password))) {
      // Si el password es incorrecto
      return res.status(401).json({ message: "Contraseña Incorrecta" });
    }

    const token = jwt.sign(
      {
        id: user.iduser,
        username: user.username,
        idcashpoint: user.idcashpoint,
      },
      "secret-key",
      { expiresIn: "3h" }
    );

    res.json({ token });
  }
});

router.get("/", async (req, res) => {
  try {
    const supervisors = await db.any("SELECT * FROM Supervisor");
    res.json(supervisors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agregar un nuevo supervisor
router.post("/agregar", verifyToken, async (req, res) => {
  const { username, password, idCashPoint } = req.body; // Include idCashPoint
  try {
    const newUser = await db.one(
      `INSERT INTO Supervisor (idCashPoint, "user", password)
              VALUES ($1, $2, $3) RETURNING *`,
      [idCashPoint, username, password] // Pass idCashPoint, username, and password
    );
    res.json(newUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un supervisor existente
router.put("/:idCashPoint", verifyToken, async (req, res) => {
  const { username, password } = req.body;
  try {
    const updatedUser = await db.one(
      `UPDATE Supervisor SET "user"=$1, password=$2
                WHERE idCashPoint=$3 RETURNING *`,
      [username, password, req.params.idCashPoint] // Use idCashPoint as identifier
    );
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un supervisor
router.delete("/:idCashPoint", verifyToken, async (req, res) => {
  const idCashPoint = req.params.idCashPoint;
  try {
    await db.none("DELETE FROM Supervisor WHERE idCashPoint=$1", [idCashPoint]);
    res.json({ message: "Supervisor eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verificar si se puede eliminar un supervisor
router.get("/canDelete/:idCashPoint", verifyToken, async (req, res) => {
  const idCashPoint = req.params.idCashPoint;
  try {
    const canDeleteUser = await db.oneOrNone(
      'SELECT COUNT(*) AS count FROM "User" WHERE idCashPoint = $1',
      [idCashPoint]
    );

    const canDeleteCashClosing = await db.oneOrNone(
      "SELECT COUNT(*) AS count FROM CashClosing WHERE idCashPoint = $1",
      [idCashPoint]
    );

    const canDeleteVirtualCashPoint = await db.oneOrNone(
      "SELECT COUNT(*) AS count FROM VirtualCashPoint WHERE idCashPoint = $1",
      [idCashPoint]
    );

    const canDeletePayment = await db.oneOrNone(
      "SELECT COUNT(*) AS count FROM Payment WHERE idCashPoint = $1",
      [idCashPoint]
    );

    const canDelete =
      canDeleteUser &&
      parseInt(canDeleteUser.count, 10) === 0 &&
      canDeleteCashClosing &&
      parseInt(canDeleteCashClosing.count, 10) === 0 &&
      canDeleteVirtualCashPoint &&
      parseInt(canDeleteVirtualCashPoint.count, 10) === 0 &&
      canDeletePayment &&
      parseInt(canDeletePayment.count, 10) === 0;

    res.json({ canDelete });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta protegida que solo puede ser accedida por usuarios autenticados
router.get("/protected", verifyToken, (req, res) => {
  // El middleware verifyToken verifica el token antes de llegar aquí
  const decoded = req.user; // Esta información se guarda en el objeto de solicitud por el middleware
  res.json({ message: "Ruta protegida accesible", user: decoded });
});

module.exports = router;
