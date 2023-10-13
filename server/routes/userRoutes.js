const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../services/verifyToken");
const { hashPassword } = require("../services/hashpassword");
const jwt = require("jsonwebtoken");

// Obtener todos los usuarios de una caja en específico
router.get("/:idcashPoint", verifyToken, async (req, res) => {
  // Si el rol del usuario no es supervisor
  if (req.user.role !== "supervisor") {
    return res.status(401).json({ message: "Unauthorized User" });
  }
  const idcashPoint = req.params.idcashPoint;

  // Si el idcashPoint no es de 16 o 21 caracteres
  if (idcashPoint.length !== 16 && idcashPoint.length !== 21) {
    return res
      .status(400)
      .json({ message: "idcashPoint must be 16 or 21 characters" });
  }

  // Si no existe el idcashPoint
  const idCashPointResult = await db.oneOrNone(
    "SELECT idCashPoint FROM Supervisor WHERE idCashPoint = $1",
    [idcashPoint]
  );

  if (!idCashPointResult) {
    return res.status(400).json({ message: "idcashPoint does not exist" });
  }

  try {
    // Obtener todos los usuarios de la caja
    const users = await db.any(
      'SELECT "User".idglobaluser, "User".isBlocked, "User".iduser, "User".username, "User".role, "User".idcashpoint, "User".idglobalvirtualcashpoint , VirtualCashPoint.idVirtualCashPoint, VirtualCashPoint.name AS virtualCashPointName FROM "User" ' +
        'INNER JOIN VirtualCashPoint ON "User".idGlobalVirtualCashPoint = VirtualCashPoint.idGlobalVirtualCashPoint ' +
        'WHERE "User".idCashPoint = $1 ORDER BY "User".role DESC, "User".username ASC',
      [idcashPoint]
    );

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agregar un nuevo usuario
router.post("/", verifyToken, async (req, res) => {
  // Si el rol del usuario no es supervisor
  if (req.user.role !== "supervisor") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  const {
    username,
    role,
    idCashPoint,
    idGlobalVirtualCashPoint,
    societydivision,
  } = req.body;

  let { password } = req.body;

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
    // Si el idCashPoint no existe
    const idCashPointResult = await db.oneOrNone(
      "SELECT idCashPoint FROM Supervisor WHERE idCashPoint = $1",
      [idCashPoint]
    );

    if (!idCashPointResult) {
      return res.status(400).json({ message: "idCashPoint does not exist" });
    }
  }

  // Si no se recibe el username
  if (!username) {
    return res.status(400).json({ message: "username required" });
  } else {
    // Si el username no es de 2 a 50 caracteres
    if (username.length < 2 || username.length > 50) {
      return res
        .status(400)
        .json({ message: "username must be 2 to 50 characters" });
    }
  }

  // Si no se recibe el societydivision
  if (!societydivision) {
    return res.status(400).json({ message: "societydivision required" });
  } else {
    // Si el societydivision no es de 2 a 50 caracteres
    if (societydivision.length < 2 || societydivision.length > 50) {
      return res
        .status(400)
        .json({ message: "societydivision must be 2 to 50 characters" });
    }
  }

  // Si no se recibe el password
  if (!password) {
    return res.status(400).json({ message: "password required" });
  } else {
    // Si el password no es de 2 a 60 caracteres
    if (password.length < 2 || password.length > 60) {
      return res
        .status(400)
        .json({ message: "password must be 2 to 60 characters" });
    }
    // Hasheo el password
    password = await hashPassword(password);
  }

  // Si no se recibe el role
  if (!role) {
    return res.status(400).json({ message: "role required" });
  } else {
    // Si el role no es gerente o cajero
    if (role !== "gerente" && role !== "cajero") {
      return res
        .status(400)
        .json({ message: "role must be gerente or cajero" });
    }
  }

  // Si no se recibe el idGlobalVirtualCashPoint
  if (!idGlobalVirtualCashPoint) {
    return res
      .status(400)
      .json({ message: "idGlobalVirtualCashPoint required" });
  } else {
    // Si el idGlobalVirtualCashPoint no es un numero
    if (isNaN(idGlobalVirtualCashPoint)) {
      return res
        .status(400)
        .json({ message: "idGlobalVirtualCashPoint must be a number" });
    }

    // Si el idGlobalVirtualCashPoint no existe o no pertenece al idCashPoint
    const idGlobalVirtualCashPointResult = await db.oneOrNone(
      "SELECT idGlobalVirtualCashPoint FROM VirtualCashPoint WHERE idGlobalVirtualCashPoint = $1 AND idCashPoint = $2",
      [idGlobalVirtualCashPoint, idCashPoint]
    );

    if (!idGlobalVirtualCashPointResult) {
      return res
        .status(400)
        .json({ message: "idGlobalVirtualCashPoint does not exist" });
    }
  }

  // Si el username ya existe en la tabla de Supervisor o User o Admin
  const userExists = await db.oneOrNone(
    `SELECT $1 AS username FROM Admin WHERE "user" = $1
    UNION
    SELECT $1 AS username FROM Supervisor WHERE "user" = $1
    UNION
    SELECT username FROM "User" WHERE username = $1;`,
    [username]
  );

  if (userExists) {
    return res.status(400).json({ message: "Username already exists" });
  }

  try {
    await db.tx(async (transaction) => {
      // Obtener el valor máximo de idUser para el idCashPoint actual
      const maxIdUserResult = await transaction.oneOrNone(
        "SELECT maxIdUser FROM MaxUserSeq WHERE idCashPoint = $1",
        [idCashPoint]
      );

      let nextIdUser = 1;
      if (maxIdUserResult) {
        nextIdUser = maxIdUserResult.maxiduser + 1;
      }

      // Si el idUser es mayor a 999 no se puede crear el usuario
      if (nextIdUser > 999) {
        return res
          .status(400)
          .json({ message: "Max users reached for this cashpoint" });
      }

      // Insertar el nuevo usuario
      const newUser = await transaction.one(
        'INSERT INTO "User" (idUser, username, password, role, idCashPoint, idGlobalVirtualCashPoint, societydivision) ' +
          "VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING idUser, username, role, idCashPoint, idGlobalVirtualCashPoint, societydivision",

        [
          nextIdUser,
          username,
          password,
          role,
          idCashPoint,
          idGlobalVirtualCashPoint,
          societydivision,
        ]
      );

      // Actualizar o insertar el valor máximo de idUser en MaxUserSeq
      await transaction.none(
        "INSERT INTO MaxUserSeq (idCashPoint, maxIdUser) VALUES ($1, $2) ON CONFLICT (idCashPoint) DO UPDATE SET maxIdUser = $2",
        [idCashPoint, nextIdUser]
      );

      // Agregar una entrada en la tabla de bitácora ("log")
      await transaction.none(
        "INSERT INTO log (username, action, description, timestamp) VALUES ($1, $2, $3, $4)",
        [
          req.user.username,
          "Crear Usuario",
          `El supervisor ${req.user.username}, de la caja ${req.user.idcashpoint}, ha creado el usuario ${username} con el rol ${role} en la caja virtual ${idGlobalVirtualCashPoint}`,
          new Date(),
        ]
      );

      res.json(newUser);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un usuario existente
router.put("/:id", verifyToken, async (req, res) => {
  // Si el rol del usuario no es supervisor
  if (req.user.role !== "supervisor") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  const id = req.params.id;
  const {
    username,
    role,
    idCashPoint,
    idGlobalVirtualCashPoint,
    societydivision,
  } = req.body;

  let { password } = req.body;
  try {
    await db.tx(async (transaction) => {
      // Si el id no es un numero
      if (isNaN(id)) {
        return res.status(400).json({ message: "id must be a number" });
      }
      // Si el id no existe
      const idResult = await transaction.oneOrNone(
        'SELECT idGlobalUser FROM "User" WHERE idGlobalUser=$1',
        [id]
      );

      if (!idResult) {
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
        // Si el idCashPoint no existe
        const idCashPointResult = await transaction.oneOrNone(
          "SELECT idCashPoint FROM Supervisor WHERE idCashPoint = $1",
          [idCashPoint]
        );

        if (!idCashPointResult) {
          return res
            .status(400)
            .json({ message: "idCashPoint does not exist" });
        }
      }

      // Si no se recibe el username
      if (!username) {
        return res.status(400).json({ message: "username required" });
      } else {
        // Si el username no es de 2 a 50 caracteres
        if (username.length < 2 || username.length > 50) {
          return res
            .status(400)
            .json({ message: "username must be 2 to 50 characters" });
        }
      }

      // Si no se recibe el societydivision
      if (!societydivision) {
        return res.status(400).json({ message: "societydivision required" });
      } else {
        // Si el societydivision no es de 2 a 50 caracteres
        if (societydivision.length < 2 || societydivision.length > 50) {
          return res
            .status(400)
            .json({ message: "societydivision must be 2 to 50 characters" });
        }
      }

      // Si no se recibe el rol
      if (!role) {
        return res.status(400).json({ message: "role required" });
      } else {
        // Si el rol no es gerente o cajero
        if (role !== "gerente" && role !== "cajero") {
          return res
            .status(400)
            .json({ message: "role must be gerente or cajero" });
        }
      }

      // Si no se recibe el idGlobalVirtualCashPoint
      if (!idGlobalVirtualCashPoint) {
        return res
          .status(400)
          .json({ message: "idGlobalVirtualCashPoint required" });
      } else {
        // Si el idGlobalVirtualCashPoint no es un numero
        if (isNaN(idGlobalVirtualCashPoint)) {
          return res
            .status(400)
            .json({ message: "idGlobalVirtualCashPoint must be a number" });
        }

        // Si el idGlobalVirtualCashPoint no existe o no pertenece al idCashPoint
        const idGlobalVirtualCashPointResult = await transaction.oneOrNone(
          "SELECT idGlobalVirtualCashPoint FROM VirtualCashPoint WHERE idGlobalVirtualCashPoint = $1 AND idCashPoint = $2",
          [idGlobalVirtualCashPoint, idCashPoint]
        );

        if (!idGlobalVirtualCashPointResult) {
          return res
            .status(400)
            .json({ message: "idGlobalVirtualCashPoint does not exist" });
        }
      }

      // Si el username ya existe en la tabla de Supervisor o User o Admin
      const userExists = await db.oneOrNone(
        `SELECT $1 AS username FROM Admin WHERE "user" = $1
    UNION
    SELECT $1 AS username FROM Supervisor WHERE "user" = $1
    UNION
    SELECT username FROM "User" WHERE username = $1;`,
        [username]
      );

      if (userExists) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Si no hay contraseña
      if (!password) {
        // Actualiza el usuario sin contraseña
        const updatedUser = await transaction.one(
          `UPDATE "User" SET username=$1, role=$2, idCashPoint=$3, idGlobalVirtualCashPoint=$4, societydivision=$5
        WHERE idGlobalUser=$6 RETURNING idGlobalUser, idUser, username, role, idCashPoint, idGlobalVirtualCashPoint, societydivision`,
          [
            username,
            role,
            idCashPoint,
            idGlobalVirtualCashPoint,
            societydivision,
            id,
          ]
        );
        res.json(updatedUser);
      } else {
        // Si el password no es de 2 a 60 caracteres
        if (password.length < 2 || password.length > 60) {
          return res
            .status(400)
            .json({ message: "password must be 2 to 60 characters" });
        }

        // Hasheo el password
        password = await hashPassword(password);

        // Actualiza el usuario con contraseña
        const updatedUser = await transaction.one(
          `UPDATE "User" SET username=$1, password=$2, role=$3, idCashPoint=$4, idGlobalVirtualCashPoint=$5, societydivision=$6
        WHERE idGlobalUser=$7 RETURNING idGlobalUser, idUser, username, role, idCashPoint, idGlobalVirtualCashPoint, societydivision`,
          [
            username,
            password,
            role,
            idCashPoint,
            idGlobalVirtualCashPoint,
            societydivision,
            id,
          ]
        );

        // Agregar una entrada en la tabla de bitácora ("log")
        await transaction.none(
          "INSERT INTO log (username, action, description, timestamp) VALUES ($1, $2, $3, $4)",
          [
            req.user.username,
            "Actualizar Usuario",
            `El supervisor ${req.user.username}, de la caja ${req.user.idcashpoint}, ha actualizado el usuario ${username} con el rol ${role} en la caja virtual ${idGlobalVirtualCashPoint}`,
            new Date(),
          ]
        );

        res.json(updatedUser);
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bloquear o desbloquear un usuario
router.put("/block/:id", verifyToken, async (req, res) => {
  // Si el rol del usuario no es supervisor
  if (req.user.role !== "supervisor") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  const id = req.params.id;
  const { isblocked } = req.body;

  // Si el id no es un numero
  if (isNaN(id)) {
    return res.status(400).json({ message: "id must be a number" });
  }
  // Si el id no existe
  const idResult = await db.oneOrNone(
    'SELECT idGlobalUser FROM "User" WHERE idGlobalUser=$1',
    [id]
  );

  if (!idResult) {
    return res.status(400).json({ message: "id does not exist" });
  }

  // Si no se recibe el isBlocked
  if (isblocked === undefined) {
    return res.status(400).json({ message: "isBlocked required" });
  } else {
    // Si el isBlocked no es true o false
    if (isblocked !== true && isblocked !== false) {
      return res
        .status(400)
        .json({ message: "isBlocked must be true or false" });
    }
  }

  try {
    // Actualiza el usuario
    const updatedUser = await db.one(
      `UPDATE "User" SET isBlocked=$1 WHERE idGlobalUser=$2 RETURNING idGlobalUser, idUser, username, role, idCashPoint, idGlobalVirtualCashPoint, societydivision`,
      [isblocked, id]
    );

    // Agregar una entrada en la tabla de bitácora ("log")
    await db.none(
      "INSERT INTO log (username, action, description, timestamp) VALUES ($1, $2, $3, $4)",
      [
        req.user.username,
        isblocked ? "Bloquear Usuario" : "Desbloquear Usuario",
        `El supervisor ${req.user.username}, de la caja ${
          req.user.idcashpoint
        }, ha ${isblocked ? "bloqueado" : "desbloqueado"} el usuario ${
          updatedUser.username
        } con el rol ${updatedUser.role} en la caja virtual ${
          updatedUser.idglobalvirtualcashpoint
        }`,
        new Date(),
      ]
    );

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Gerente puede cambiarse de caja virtual
router.put("/changeVirtualCashPoint/:id", verifyToken, async (req, res) => {
  // Si el rol del usuario no es gerente
  if (req.user.role !== "gerente") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  const id = req.params.id;
  const { newidglobalvirtualcashpoint, idcashpoint } = req.body;

  // Si el id no es un numero
  if (isNaN(id)) {
    return res.status(400).json({ message: "id must be a number" });
  }
  // Si el id no existe
  const idResult = await db.oneOrNone(
    'SELECT idGlobalUser FROM "User" WHERE idGlobalUser=$1',
    [id]
  );

  if (!idResult) {
    return res.status(400).json({ message: "id does not exist" });
  }

  // Si no se recibe el idcashPoint
  if (!idcashpoint) {
    return res.status(400).json({ message: "idcashPoint required" });
  } else {
    // Si el idcashPoint no es de 16 o 21 caracteres
    if (idcashpoint.length !== 16 && idcashpoint.length !== 21) {
      return res
        .status(400)
        .json({ message: "idcashPoint must be 16 or 21 characters" });
    }
    // Si el idcashPoint no existe
    const idCashPointResult = await db.oneOrNone(
      "SELECT idCashPoint FROM Supervisor WHERE idCashPoint = $1",
      [idcashpoint]
    );

    if (!idCashPointResult) {
      return res.status(400).json({ message: "idcashPoint does not exist" });
    }
  }

  // Si no se recibe el newidglobalvirtualcashpoint
  if (!newidglobalvirtualcashpoint) {
    return res
      .status(400)
      .json({ message: "newidglobalvirtualcashpoint required" });
  } else {
    // Si el newidglobalvirtualcashpoint no es un numero
    if (isNaN(newidglobalvirtualcashpoint)) {
      return res
        .status(400)
        .json({ message: "newidglobalvirtualcashpoint must be a number" });
    }

    // Si el newidglobalvirtualcashpoint no existe o no pertenece al idcashpoint
    const idGlobalVirtualCashPointResult = await db.oneOrNone(
      "SELECT idGlobalVirtualCashPoint FROM VirtualCashPoint WHERE idGlobalVirtualCashPoint = $1 AND idCashPoint = $2",
      [newidglobalvirtualcashpoint, idcashpoint]
    );

    if (!idGlobalVirtualCashPointResult) {
      return res
        .status(400)
        .json({ message: "newidglobalvirtualcashpoint does not exist" });
    }
  }

  try {
    // Actualiza el usuario con la nueva caja virtual, haciedno join con virtualcashpoitn para obtener el nombre
    const updatedUser = await db.one(
      `UPDATE "User" AS u
   SET idGlobalVirtualCashPoint = $1
   FROM VirtualCashPoint AS vc
   WHERE u.idGlobalUser = $2 AND u.idGlobalVirtualCashPoint = vc.idGlobalVirtualCashPoint
   RETURNING u.idGlobalUser, u.idUser, u.username, u.role, u.idCashPoint, u.idGlobalVirtualCashPoint, vc.idVirtualCashPoint, vc.name AS virtualCashPointName, u.societydivision`,
      [newidglobalvirtualcashpoint, id]
    );

    // Actualiza el token
    const token = jwt.sign(
      {
        id: updatedUser.iduser,
        idglobaluser: updatedUser.idglobaluser,
        username: updatedUser.username,
        role: updatedUser.role,
        idglobalvirtualcashpoint: updatedUser.idglobalvirtualcashpoint,
        idcashpoint: updatedUser.idcashpoint,
        societydivision: updatedUser.societydivision,
        idvirtualcashpoint: updatedUser.idvirtualcashpoint,
        virtualcashpointname: updatedUser.virtualcashpointname,
      },
      "admin_CTIC_2023!",
      { expiresIn: "1h" }
    );

    // Agregar una entrada en la tabla de bitácora ("log")
    await db.none(
      "INSERT INTO log (username, action, description, timestamp) VALUES ($1, $2, $3, $4)",
      [
        req.user.username,
        "Cambiar Caja Virtual",
        `El usuario ${req.user.username}, de la caja ${req.user.idcashpoint}, ha cambiado de la caja virtual ${req.user.idvirtualcashpoint} a la caja virtual ${updatedUser.idvirtualcashpoint}`,
        new Date(),
      ]
    );

    res.json(token);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un usuario
router.delete("/:id", verifyToken, async (req, res) => {
  // Si el rol del usuario no es supervisor
  if (req.user.role !== "supervisor") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  const id = req.params.id;

  // Si el id no es un numero
  if (isNaN(id)) {
    return res.status(400).json({ message: "id must be a number" });
  }

  try {
    await db.tx(async (transaction) => {
      // Si el id no existe y obtiene el idCashPoint del usuario a eliminar
      const idResult = await db.oneOrNone(
        'SELECT idGlobalUser, idCashPoint FROM "User" WHERE idGlobalUser=$1',
        [id]
      );

      if (!idResult) {
        return res.status(400).json({ message: "id does not exist" });
      }

      // Verificar si se puede eliminar el usuario

      const counts = await transaction.one(
        // Si el usuario tiene pagos o pagos reversos
        "SELECT (SELECT COUNT(*) AS count FROM Payment WHERE idGlobalUser = $1) AS payment_count, " +
          "(SELECT COUNT(*) AS count FROM ReversePayment WHERE idGlobalUser = $1) AS reverse_payment_count",
        [id]
      );

      if (
        counts.payment_count !== "0" ||
        counts.reverse_payment_count !== "0"
      ) {
        return res
          .status(400)
          .json({ message: "User has payments or reverse payments" });
      }

      // Eliminamos el usuario
      const deletedUser = await transaction.oneOrNone(
        'DELETE FROM "User" WHERE idGlobalUser=$1 RETURNING idGlobalUser',
        [id]
      );

      if (deletedUser) {
        // Actualizar o eliminar el registro de MaxUserSeq según sea necesario
        const remainingUsers = await transaction.oneOrNone(
          'SELECT COUNT(*) AS count FROM "User" WHERE idCashPoint = $1',
          [idResult.idcashpoint]
        );

        if (remainingUsers.count === "0") {
          await db.none("DELETE FROM MaxUserSeq WHERE idCashPoint = $1", [
            idResult.idcashpoint,
          ]);
        }

        // Agregar una entrada en la tabla de bitácora ("log")
        await transaction.none(
          "INSERT INTO log (username, action, description, timestamp) VALUES ($1, $2, $3, $4)",
          [
            req.user.username,
            "Eliminar Usuario",
            `El supervisor ${req.user.username}, de la caja ${req.user.idcashpoint}, ha eliminado el usuario ${idResult.idglobaluser}`,
            new Date(),
          ]
        );

        res.json({ message: "User deleted successfully" });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
