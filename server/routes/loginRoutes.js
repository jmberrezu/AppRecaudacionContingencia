const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const verifyToken = require("../services/verifyToken");
const { checkPassword } = require("../services/hashpassword");
const { addActiveToken } = require("../services/verifyToken");
const { deleteActiveToken } = require("../services/verifyToken");

const failedLoginAttempts = {}; // Objeto para rastrear los intentos fallidos de inicio de sesión por usuario

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
      // Verificar si la cuenta esta bloqueada
      if (user.isblocked) {
        return res.status(403).json({ message: "Account is Blocked." });
      }

      // Si el usuario existe
      if (!(await checkPassword(password, user.password))) {
        // Si el usuario ha fallado el inicio de sesión 3 veces
        failedLoginAttempts[username] =
          (failedLoginAttempts[username] || 0) + 1;

        if (failedLoginAttempts[username] >= 3) {
          // Bloquear la cuenta
          await db.none(
            'UPDATE "User" SET isBlocked = true WHERE username = $1',
            [username]
          );

          return res.status(403).json({ message: "Account is Blocked." });
        }

        // Si la contraseña es incorrecta
        return res.status(401).json({ message: "Incorrect Password" });
      }

      // Si el usuario ha iniciado sesión correctamente, restablecer el número de intentos fallidos
      failedLoginAttempts[username] = 0;

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

      // Agregar el token al conjunto de tokens activos
      addActiveToken(user.idglobaluser, token);

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

// Cerrar sesión
router.delete("/logout", verifyToken, (req, res) => {
  // Eliminar el token del conjunto de tokens activos
  deleteActiveToken(req.user.idglobaluser);
  res.json({ message: "Logout successful" });
});

module.exports = router;
