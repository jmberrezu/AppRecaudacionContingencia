const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

router.post("/", async (req, res) => {
  const { username, password } = req.body;

  // Busca usuario en la base de datos
  const user = await db.oneOrNone('SELECT * FROM "User" WHERE username = $1', [
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
      { id: user.iduser, username: user.username, role: user.role },
      "secret-key",
      { expiresIn: "3h" }
    );

    res.json({ token });
  }
});

// Ruta protegida que solo puede ser accedida por usuarios autenticados
router.get("/protected", (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  try {
    const decoded = jwt.verify(token, "secret-key");
    res.json({ message: "Ruta protegida accesible", user: decoded });
  } catch (error) {
    res.status(401).json({ message: "Token inválido" });
  }
});

module.exports = router;
