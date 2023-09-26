const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const verifyToken = require("../services/verifyToken");
const { hashPassword, checkPassword } = require("../services/hashpassword");
const multer = require("multer");
const { addActiveToken } = require("../services/verifyToken");
const { deleteActiveToken } = require("../services/verifyToken");

// Configura el almacenamiento para los archivos CSV
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Ruta para iniciar sesión
router.post("/", async (req, res) => {
  const { username, password } = req.body;

  // Si no se ha proporcionado usuario o contraseña
  if (!username || !password) {
    return res.status(400).json({ message: "User and Password Required" });
  }

  // Busca usuario en la base de datos
  const user = await db.oneOrNone('SELECT * FROM Admin WHERE "user" = $1', [
    username,
  ]);

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
        role: "admin",
      },
      "admin_CTIC_2023!",
      { expiresIn: "3h" } // El token expira en 3 horas
    );

    // Agregar el token al conjunto de tokens activos
    addActiveToken(username, token);

    res.json({ token });
  }
});

// Verificar si el token es válido y devuelve el rol del usuario
router.get("/verify", verifyToken, (req, res) => {
  res.json({ role: req.user.role });
});

// Obtener todos los supervisores
router.get("/", verifyToken, async (req, res) => {
  // Si el rol del usuario no es admin
  if (req.user.role !== "admin") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  try {
    const supervisors = await db.any("SELECT * FROM Supervisor");
    res.json(supervisors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agregar un nuevo supervisor
router.post("/agregar", verifyToken, async (req, res) => {
  // Si el rol del usuario no es admin
  if (req.user.role !== "admin") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  const { username, idCashPoint, office } = req.body;
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

  // Si no se recibe la oficina
  if (!office) {
    return res.status(400).json({ message: "office required" });
  } else {
    // Si la oficina no es de 2 a 50 caracteres
    if (office.length < 2 || office.length > 50) {
      return res
        .status(400)
        .json({ message: "office must be 2 to 50 characters" });
    }
  }

  // Si no se recibe el password
  if (!password) {
    return res.status(400).json({ message: "password required" });
  } else {
    // Si el password no es de 2 a 100 caracteres
    if (password.length < 2 || password.length > 60) {
      return res
        .status(400)
        .json({ message: "password must be 2 to 60 characters" });
    }

    // Hasheo el password
    password = await hashPassword(password);
  }

  try {
    await db.tx(async (transaction) => {
      let newUser = null;
      // Agrego el supervisor a la base de datos
      newUser = await transaction.one(
        `INSERT INTO Supervisor (idCashPoint, "user", office, password)
              VALUES ($1, $2, $3, $4) RETURNING idCashPoint, "user"`,
        [idCashPoint, username, office, password]
      );
      res.json(newUser); // Devuelvo el usuario creado
    });
  } catch (error) {
    // Si el idCashPoint ya existe
    if (error.code === "23505") {
      return res.status(400).json({ message: "idCashPoint already exists" });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Actualizar un supervisor existente
router.put("/:idCashPoint", verifyToken, async (req, res) => {
  // Si el rol del usuario no es admin
  if (req.user.role !== "admin") {
    return res.status(401).json({ message: "Unauthorizead User" });
  }

  const idCashPoint = req.params.idCashPoint;
  const { username, office } = req.body;
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

  // Si no se recibe la oficina
  if (!office) {
    return res.status(400).json({ message: "office required" });
  } else {
    // Si la oficina no es de 2 a 50 caracteres
    if (office.length < 2 || office.length > 50) {
      return res
        .status(400)
        .json({ message: "office must be 2 to 50 characters" });
    }
  }

  // Si se recibe el password
  if (password) {
    // Si el password no es de 2 a 100 caracteres
    if (password.length < 2 || password.length > 60) {
      return res
        .status(400)
        .json({ message: "password must be 2 to 60 characters" });
    }

    // Hasheo el password
    password = await hashPassword(password);
  }

  try {
    await db.tx(async (transaction) => {
      // Busca el supervisor a actualizar
      const supervisorToUpdate = await transaction.oneOrNone(
        `SELECT * FROM Supervisor WHERE idCashPoint = $1`,
        [idCashPoint]
      );

      if (!supervisorToUpdate) {
        return res.status(404).json({ message: "Supervisor not found" });
      }

      // Si no hay contraseña
      if (!password) {
        // Actualiza el supervisor sin contraseña
        const updatedUser = await transaction.one(
          `UPDATE Supervisor SET "user"=$1, office=$3
          WHERE idCashPoint=$2 RETURNING idCashPoint, "user", office`,
          [username, idCashPoint, office]
        );

        // Devuelve la respuesta exitosa
        return res.json(updatedUser);
      }

      // Realiza la actualización solo si el supervisor existe y hay contraseña
      const updatedUser = await transaction.one(
        `UPDATE Supervisor SET "user"=$1, password=$2, office=$4
       WHERE idCashPoint=$3 RETURNING idCashPoint, "user", office`,
        [username, password, idCashPoint, office]
      );
      // Devuelve la respuesta exitosa
      res.json(updatedUser);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un supervisor
router.delete("/:idCashPoint", verifyToken, async (req, res) => {
  // Si el rol del usuario no es admin
  if (req.user.role !== "admin") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  const idCashPoint = req.params.idCashPoint;

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
  }

  try {
    await db.tx(async (transaction) => {
      // Busca el supervisor a eliminar
      const supervisorToDelete = await transaction.oneOrNone(
        `SELECT * FROM Supervisor WHERE idCashPoint = $1`,
        [idCashPoint]
      );

      if (!supervisorToDelete) {
        return res.status(404).json({ message: "Supervisor not found" });
      }

      // Verificar si se puede eliminar el supervisor
      const counts = await transaction.one(
        `
      SELECT
        (SELECT COUNT(*) FROM "User" WHERE idCashPoint = $1) AS user_count,
        (SELECT COUNT(*) FROM CashClosing WHERE idCashPoint = $1) AS cash_closing_count,
        (SELECT COUNT(*) FROM VirtualCashPoint WHERE idCashPoint = $1) AS virtual_cash_point_count,
        (SELECT COUNT(*) FROM Payment WHERE idCashPoint = $1) AS payment_count,
        (SELECT COUNT(*) FROM ReversePayment WHERE idCashPoint = $1) AS reverse_payment_count,
        (SELECT COUNT(*) FROM PaymentGroup WHERE idCashPoint = $1) AS payment_group_count
    `,
        [idCashPoint]
      );

      switch (true) {
        case counts.user_count > 0:
          return res.status(400).json({
            message: "Supervisor cannot be deleted because it has users",
          });
        case counts.cash_closing_count > 0:
          return res.status(400).json({
            message:
              "Supervisor cannot be deleted because it has cash closings",
          });
        case counts.virtual_cash_point_count > 0:
          return res.status(400).json({
            message:
              "Supervisor cannot be deleted because it has virtual cash points",
          });
        case counts.payment_count > 0:
          return res.status(400).json({
            message: "Supervisor cannot be deleted because it has payments",
          });
        case counts.reverse_payment_count > 0:
          return res.status(400).json({
            message:
              "Supervisor cannot be deleted because it has reverse payments",
          });
        case counts.payment_group_count > 0:
          return res.status(400).json({
            message:
              "Supervisor cannot be deleted because it has payment groups",
          });
        default:
          await db.none("DELETE FROM Supervisor WHERE idCashPoint=$1", [
            idCashPoint,
          ]);
          res.json({ message: "Supervisor eliminado exitosamente" });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta para cargar el archivo CSV
router.post(
  "/upload-csv",
  upload.single("csvFile"),
  verifyToken,
  async (req, res) => {
    // Si el rol del usuario no es admin
    if (req.user.role !== "admin") {
      return res.status(401).json({ message: "Unauthorized User" });
    }

    const idcashpoint = req.body.idcashpoint;

    // Si no se recibe el idCashPoint
    if (!idcashpoint) {
      return res.status(400).json({ error: "idCashPoint required" });
    } else {
      // Si el idCashPoint no es de 16 o 21 caracteres
      if (idcashpoint.length !== 16 && idcashpoint.length !== 21) {
        return res
          .status(400)
          .json({ error: "idCashPoint must be 16 or 21 characters" });
      }
    }

    // Si existen grupos sin cerrar o cajas cerradas sin enviar no se puede cargar el archivo CSV
    const counts = await db.one(
      `
      SELECT
        (SELECT COUNT(*) FROM PaymentGroup WHERE idCashPoint = $1) AS open_payment_group_count,
        (SELECT COUNT(*) FROM CashClosing WHERE idCashPoint = $1) AS closed_cash_closing_count
    `,
      [idcashpoint]
    );

    if (
      counts.open_payment_group_count > 0 ||
      counts.closed_cash_closing_count > 0
    ) {
      return res.status(400).json({
        error:
          "No se puede cargar el archivo CSV porque existen grupos sin cerrar o cajas cerradas sin enviar.",
      });
    }

    // Si no se recibe el archivo CSV
    if (!req.file) {
      return res.status(400).json({ error: "Ingrese un archivo CSV" });
    }

    try {
      // Accede al archivo CSV cargado desde req.file.buffer
      const csvData = req.file.buffer.toString(); // Convierte el buffer a una cadena

      // Divide las líneas del CSV usando el punto y coma como separador
      const lines = csvData.split("\n");

      // La primera línea contiene nombres de columnas
      const columns = lines[0].split(";");

      // Elimina las comillas simples de la cabecera y trim() los nombres de columna
      for (let i = 0; i < columns.length; i++) {
        columns[i] = columns[i].replace(/'/g, "").trim();
      }

      let flag = false;

      await db.tx(async (transaction) => {
        // Limpio la tabla de reversePayment agregandolas en la tabla de PaymentSent
        const reversepayments = await db.manyOrNone(
          `
          SELECT * FROM ReversePayment WHERE idCashPoint = $1
          `,
          [idcashpoint]
        );

        for (const reverse of reversepayments) {
          await transaction.none(
            `
            INSERT INTO reversepaymentsent(PaymentTransactionID, idcashpoint, fecha_hora, paymentamountcurrencycode)
            VALUES ($1, $2, $3, $4)
            `,
            [
              reverse.paymenttransactionid,
              reverse.idcashpoint,
              reverse.fecha_hora,
              reverse.paymentamountcurrencycode,
            ]
          );

          await transaction.none(
            `
            DELETE FROM ReversePayment WHERE PaymentTransactionID = $1
            `,
            [reverse.paymenttransactionid]
          );
        }

        // Limpio la tabla Client
        await transaction.none("DELETE FROM Client where idcashpoint=$1", [
          idcashpoint,
        ]);

        // Itera a través de las líneas y procesa los registros
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(";");
          if (values.length === columns.length) {
            // Construye un objeto con los valores del registro
            const record = {};
            for (let j = 0; j < columns.length; j++) {
              record[columns[j]] = values[j].replace(/\r/g, "");
            }

            try {
              // Inserta el registro en la tabla Client
              await transaction.query(
                `
              INSERT INTO Client (PayerContractAccountID, CUEN, name, address, debt, idcashpoint, parroquia, isdisconnected)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              `,
                [
                  record.CUENTACONTRATO,
                  record.CUEN.substring(0, 10),
                  record.NOMBRE,
                  record.DIRECCION,
                  parseFloat(record.DEUDA.replace(",", ".")),
                  idcashpoint,
                  record.PARROQUIA,
                  record.ESTADESCONECTADO,
                ]
              );
            } catch (error) {
              flag = i + 1;
              console.error("Error al cargar el archivo CSV:", error);
              return;
            }
          }
        }
      });

      // Después de salir del bucle, verifica la bandera
      if (flag) {
        // Hubo errores en el proceso, envía una respuesta de error
        res
          .status(500)
          .json({ error: "Error del CSV en la linea: " + flag + "." });
      } else {
        // No hubo errores, envía una respuesta de éxito
        res.status(200).json({ message: "Archivo CSV cargado exitosamente." });
      }
    } catch (error) {
      console.error("Error al cargar el archivo CSV:", error);
      res.status(500).json({ error: "Error al cargar el archivo CSV." });
    }
  }
);

// Ruta para cerrar sesion
router.delete("/new/logout", verifyToken, (req, res) => {
  // Eliminar el token del conjunto de tokens activos
  deleteActiveToken("admin");
  res.json({ message: "Logout successful" });
});

module.exports = router;
