const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const verifyToken = require("./verifyToken");

router.post("/", async (req, res) => {
  const { username, password } = req.body;

  // Busca usuario en la base de datos
  const user = await db.oneOrNone(
    'SELECT * FROM Supervisor WHERE "user" = $1',
    [username]
  );

  if (!user) {
    // Si el usuario no existe
    return res.status(401).json({ message: "Usuario no Encontrado." });
  } else {
    if (!(await bcrypt.compare(password, user.password))) {
      // Si el password es incorrecto
      return res.status(401).json({ message: "Contraseña Incorrecta" });
    }

    console.log(user);

    const token = jwt.sign(
      {
        username: user.user,
        idcashpoint: user.idcashpoint,
      },
      "secret-key",
      { expiresIn: "3h" }
    );

    res.json({ token });
  }
});

// Ruta protegida que solo puede ser accedida por usuarios autenticados
router.get("/protected", verifyToken, (req, res) => {
  // El middleware verifyToken verifica el token antes de llegar aquí
  const decoded = req.user; // Esta información se guarda en el objeto de solicitud por el middleware
  res.json({ message: "Ruta protegida accesible", user: decoded });
});

module.exports = router;
