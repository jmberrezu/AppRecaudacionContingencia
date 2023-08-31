const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const verifyToken = require("../services/verifyToken");
const { checkPassword } = require("../services/hashpassword");

// Ruta para iniciar sesión
router.post("/", async (req, res) => {
  const { username, password } = req.body;

  // Si no se ha proporcionado usuario o contraseña
  if (!username || !password) {
    return res.status(400).json({ message: "Usuario y Contraseña Requeridos" });
  }

  try {
    // Buscar usuario en la base de datos
    const user = await db.oneOrNone(
      'SELECT "User".*, VirtualCashPoint.idVirtualCashPoint, VirtualCashPoint.name AS virtualCashPointName ' +
        'FROM "User" ' +
        'INNER JOIN VirtualCashPoint ON "User".idGlobalVirtualCashPoint = VirtualCashPoint.idGlobalVirtualCashPoint ' +
        "WHERE username = $1",
      [username]
    );

    if (!user) {
      // Si el usuario no existe
      return res.status(401).json({ message: "User Not Found." });
    } else {
      // Si el usuario existe
      if (!(await checkPassword(password, user.password))) {
        // Si la contraseña es incorrecta
        return res.status(401).json({ message: "Incorrect Password" });
      }

      const token = jwt.sign(
        {
          id: user.iduser,
          idglobaluser: user.idglobaluser,
          username: user.username,
          role: user.role,
          idglobalvirtualcashpoint: user.idglobalvirtualcashpoint,
          idcashpoint: user.idcashpoint,
          idvirtualcashpoint: user.idvirtualcashpoint, // Agregar idVirtualCashPoint al token
          virtualcashpointname: user.virtualcashpointname, // Agregar virtualCashPointName al token
        },
        "admin_CTIC_2023!",
        { expiresIn: "3h" } // El token expira en 3 horas
      );

      res.json({ token });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verificar si el token es válido y devuelve el rol del usuario
router.get("/verify", verifyToken, (req, res) => {
  res.json({
    id: req.user.id,
    role: req.user.role,
    username: req.user.username,
    virtualcashpointname: req.user.virtualcashpointname,
    idvirtualcashpoint: req.user.idvirtualcashpoint,
    idcashpoint: req.user.idcashpoint,
    idglobaluser: req.user.idglobaluser,
    idglobalvirtualcashpoint: req.user.idglobalvirtualcashpoint,
  });
});

module.exports = router;
