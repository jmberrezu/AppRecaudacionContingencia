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
    let userfound = []; // Variable para almacenar el usuario encontrado y que tipo de usuario es

    // Buscar usuario en la base de datos
    const user = await db.oneOrNone(
      'SELECT "User".*, VirtualCashPoint.idVirtualCashPoint, VirtualCashPoint.name AS virtualCashPointName ' +
        'FROM "User" ' +
        'INNER JOIN VirtualCashPoint ON "User".idGlobalVirtualCashPoint = VirtualCashPoint.idGlobalVirtualCashPoint ' +
        "WHERE username = $1",
      [username]
    );

    if (user) {
      userfound = [user, "user"];
    }

    // Buscar un supervisor en la base de datos, si no ha encontrado un usuario
    if (userfound.length === 0) {
      const supervisor = await db.oneOrNone(
        'SELECT * FROM Supervisor WHERE "user" = $1',
        [username]
      );

      if (supervisor) {
        userfound = [supervisor, "supervisor"];
      }
    }

    // Busca un administrador en la base de datos, si no ha encontrado un usuario o supervisor
    if (userfound.length === 0) {
      const admin = await db.oneOrNone(
        'SELECT * FROM Admin WHERE "user" = $1',
        [username]
      );

      if (admin) {
        userfound = [admin, "admin"];
      }
    }

    // Si no se ha encontrado un usuario, supervisor o administrador
    if (!userfound.length === 0) {
      return res.status(401).json({ message: "User Not Found." });
    }

    // Verificar si la cuenta esta bloqueada
    if (userfound[0].isblocked) {
      return res.status(403).json({ message: "Account is Blocked." });
    }

    // Si el usuario existe
    if (!(await checkPassword(password, userfound[0].password))) {
      // Si el usuario ha fallado el inicio de sesión 3 veces
      failedLoginAttempts[username] = (failedLoginAttempts[username] || 0) + 1;

      if (failedLoginAttempts[username] >= 3) {
        if (userfound[1] === "user") {
          // Si es un usuario
          // Bloquear la cuenta
          await db.none(
            'UPDATE "User" SET isBlocked = true WHERE username = $1',
            [username]
          );

          return res.status(403).json({ message: "Account is Blocked." });
        } else if (userfound[1] === "supervisor") {
          // Si es un supervisor
          // Bloquear la cuenta
          await db.none(
            'UPDATE Supervisor SET isBlocked = true WHERE "user" = $1',
            [username]
          );

          return res.status(403).json({ message: "Account is Blocked." });
        }
        // Si es un administrador, no se bloquea la cuenta
      }

      // Si la contraseña es incorrecta
      return res.status(401).json({ message: "Incorrect Password" });
    }

    // Si el usuario ha iniciado sesión correctamente, restablecer el número de intentos fallidos
    failedLoginAttempts[username] = 0;

    // Crear el token
    let token = "";

    // Si es un usuario
    if (userfound[1] === "user") {
      token = jwt.sign(
        {
          id: userfound[0].iduser,
          idglobaluser: userfound[0].idglobaluser,
          username: userfound[0].username,
          role: userfound[0].role,
          idglobalvirtualcashpoint: userfound[0].idglobalvirtualcashpoint,
          idcashpoint: userfound[0].idcashpoint,
          idvirtualcashpoint: userfound[0].idvirtualcashpoint, // Agregar idVirtualCashPoint al token
          virtualcashpointname: userfound[0].virtualcashpointname, // Agregar virtualCashPointName al token
        },
        "admin_CTIC_2023!",
        { expiresIn: "3h" } // El token expira en 3 horas
      );

      // Agregar el token al conjunto de tokens activos
      addActiveToken(userfound[0].idglobaluser, token);
    } else if (userfound[1] === "supervisor") {
      token = jwt.sign(
        {
          role: "supervisor",
          idcashpoint: userfound[0].idcashpoint,
          username: userfound[0].user,
          office: userfound[0].office,
        },
        "admin_CTIC_2023!",
        { expiresIn: "3h" } // El token expira en 3 horas
      );

      // Agregar el token al conjunto de tokens activos
      addActiveToken(userfound[0].idcashpoint, token);
    } else if (userfound[1] === "admin") {
      token = jwt.sign(
        {
          role: "admin",
        },
        "admin_CTIC_2023!",
        { expiresIn: "3h" } // El token expira en 3 horas
      );

      // Agregar el token al conjunto de tokens activos
      addActiveToken("admin", token);
    }

    // Devolver el token y userType
    res.json({ token, userType: userfound[1] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verificar si el token es válido y devuelve el rol del usuario
router.get("/verify", verifyToken, (req, res) => {
  // Si es un usuario el rol sera gerente o cajero
  if (req.user.role === "gerente" || req.user.role === "cajero") {
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
  } else if (req.user.role === "supervisor") {
    res.json({
      role: req.user.role,
      idcashpoint: req.user.idcashpoint,
      username: req.user.username,
      office: req.user.office,
    });
  } else if (req.user.role === "admin") {
    res.json({
      role: req.user.role,
    });
  }
});

// Cerrar sesión
router.delete("/logout", verifyToken, (req, res) => {
  // Eliminar el token del conjunto de tokens activos

  // Si es un usuario
  if (req.user.role === "gerente" || req.user.role === "cajero") {
    deleteActiveToken(req.user.idglobaluser);
    res.json({ message: "Logout successful" });
  } else if (req.user.role === "supervisor") {
    deleteActiveToken(req.user.idcashpoint);
    res.json({ message: "Logout successful" });
  } else if (req.user.role === "admin") {
    deleteActiveToken("admin");
    res.json({ message: "Logout successful" });
  }
});

module.exports = router;
