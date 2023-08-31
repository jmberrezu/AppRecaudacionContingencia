const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const verifyToken = require("../services/verifyToken");
const { checkPassword } = require("../services/hashpassword");

// Ruta para iniciar sesión
router.post("/", async (req, res) => {
  const { username, password } = req.body;

  // Si no se ha proporcionado usuario o contraseña
  if (!username || !password) {
    return res.status(400).json({ message: "User and Password Required" });
  }

  // Busca usuario en la base de datos
  const user = await db.oneOrNone(
    'SELECT * FROM Supervisor WHERE "user" = $1',
    [username]
  );

  if (!user) {
    // Si el usuario no existe
    return res.status(401).json({ message: "User Not Found." });
  } else {
    // Si el usuario existe

    // Si el password es incorrecto
    if (!(await checkPassword(password, user.password))) {
      return res.status(401).json({ message: "Incorrect Password" });
    }

    const token = jwt.sign(
      {
        role: "supervisor",
        idcashpoint: user.idcashpoint,
        username: user.user,
      },
      "admin_CTIC_2023!",
      { expiresIn: "3h" } // El token expira en 3 horas
    );

    res.json({ token });
  }
});

// Verificar si el token es válido y devuelve el rol del usuario, el username y la caja
router.get("/verify", verifyToken, (req, res) => {
  res.json({
    role: req.user.role,
    idcashpoint: req.user.idcashpoint,
    username: req.user.username,
  });
});

module.exports = router;
