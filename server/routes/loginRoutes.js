const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const verifyToken = require("./verifyToken");

router.post("/", async (req, res) => {
  const { username, password } = req.body;

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
      return res.status(401).json({ message: "Usuario no Encontrado." });
    } else {
      if (!(await bcrypt.compare(password, user.password))) {
        // Si la contraseña es incorrecta
        return res.status(401).json({ message: "Contraseña Incorrecta" });
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
        "secret-key",
        { expiresIn: "3h" }
      );

      res.json({ token });
    }
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
