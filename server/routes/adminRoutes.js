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

// Obtener todos los supervisores
router.get("/", verifyToken, async (req, res) => {
  // Si el rol del usuario no es admin
  if (req.user.role !== "admin") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  try {
    const supervisors = await db.any(
      "SELECT * FROM Supervisor ORDER BY societydivision, idCashPoint" // Ordena por sociedad y idCashPoint
    );
    res.json(supervisors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener todas las empresas
router.get("/company", verifyToken, async (req, res) => {
  // Si el rol del usuario no es admin
  if (req.user.role !== "admin") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  try {
    const companies = await db.any(
      "SELECT * FROM Company ORDER BY societydivision" // Ordena por sociedad
    );
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agregar una nueva empresa
router.post("/company", verifyToken, async (req, res) => {
  // Si el rol del usuario no es admin
  if (req.user.role !== "admin") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  const { societydivision, name } = req.body;

  // Si no se recibe el societydivision
  if (!societydivision) {
    return res.status(400).json({ message: "societydivision required" });
  } else {
    // Si el societydivision no es de 2 a 21 caracteres
    if (societydivision.length < 2 || societydivision.length > 21) {
      return res
        .status(400)
        .json({ message: "societydivision must be 2 to 21 characters" });
    }
  }

  // Si no se recibe el nombre
  if (!name) {
    return res.status(400).json({ message: "name required" });
  } else {
    // Si el nombre no es de 2 a 50 caracteres
    if (name.length < 2 || name.length > 50) {
      return res
        .status(400)
        .json({ message: "name must be 2 to 50 characters" });
    }
  }

  try {
    await db.tx(async (transaction) => {
      let newCompany = null;
      // Agrego la empresa a la base de datos
      newCompany = await transaction.one(
        `INSERT INTO Company (societydivision, name)
              VALUES ($1, $2) RETURNING societydivision, name`,
        [societydivision, name]
      );

      // Agregar una entrada en la tabla de bitácora ("log")
      await transaction.none(
        `INSERT INTO log (username, action, description, timestamp)
            VALUES ($1, $2, $3, $4)`,
        [
          "admin",
          "Agregar empresa",
          `Agregada empresa ${societydivision}, nombre: ${name}`,
          new Date(),
        ]
      );

      res.json(newCompany); // Devuelvo la empresa creada
    });
  } catch (error) {
    // Si el societydivision ya existe
    if (error.code === "23505") {
      return res
        .status(400)
        .json({ message: "societydivision already exists" });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Actualizar una empresa existente
router.put("/company/:societydivision", verifyToken, async (req, res) => {
  // Si el rol del usuario no es admin
  if (req.user.role !== "admin") {
    return res.status(401).json({ message: "Unauthorizead User" });
  }

  const societydivision = req.params.societydivision;
  const { name } = req.body;

  // Si no se recibe el societydivision
  if (!societydivision) {
    return res.status(400).json({ message: "societydivision required" });
  } else {
    // Si el soscietydivision no es de 2 a 21 caracteres
    if (societydivision.length < 2 || societydivision.length > 21) {
      return res
        .status(400)
        .json({ message: "societydivision must be 2 to 21 characters" });
    }
  }

  // Si no se recibe el nombre o el nombre no es de 2 a 50 caracteres
  if (!name) {
    return res.status(400).json({ message: "name required" });
  } else {
    // Si el nombre no es de 2 a 50 caracteres
    if (name.length < 2 || name.length > 50) {
      return res
        .status(400)
        .json({ message: "name must be 2 to 50 characters" });
    }
  }

  try {
    await db.tx(async (transaction) => {
      // Busca la empresa a actualizar
      const companyToUpdate = await transaction.oneOrNone(
        `SELECT * FROM Company WHERE societydivision = $1`,
        [societydivision]
      );

      if (!companyToUpdate) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Actualiza la empresa
      const updatedCompany = await transaction.one(
        `UPDATE Company SET name=$1
          WHERE societydivision=$2 RETURNING societydivision, name`,
        [name, societydivision]
      );

      // Agregar una entrada en la tabla de bitácora ("log")
      await transaction.none(
        `INSERT INTO log (username, action, description, timestamp)
            VALUES ($1, $2, $3, $4)`,
        [
          "admin",
          "Actualizar empresa",
          `Actualizada empresa ${societydivision}, nombre: ${name}`,
          new Date(),
        ]
      );

      // Devuelve la respuesta exitosa
      res.json(updatedCompany);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar una empresa
router.delete("/company/:societydivision", verifyToken, async (req, res) => {
  // Si el rol del usuario no es admin
  if (req.user.role !== "admin") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  const societydivision = req.params.societydivision;

  // Si no se recibe el societydivision
  if (!societydivision) {
    return res.status(400).json({ message: "societydivision required" });
  } else {
    // Si el societydivision no es de 2 a 21 caracteres
    if (societydivision.length < 2 || societydivision.length > 21) {
      return res
        .status(400)
        .json({ message: "societydivision must be 2 to 21 characters" });
    }
  }

  try {
    await db.tx(async (transaction) => {
      // Busca la empresa a eliminar
      const companyToDelete = await transaction.oneOrNone(
        `SELECT * FROM Company WHERE societydivision = $1 ORDER BY societydivision`, // Ordena por sociedad
        [societydivision]
      );

      if (!companyToDelete) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Verificar si se puede eliminar la empresa, si tiene un supervisor asignado
      const counts = await transaction.one(
        `SELECT COUNT(*) FROM Supervisor WHERE societydivision = $1`,
        [societydivision]
      );

      if (counts.count > 0) {
        return res.status(400).json({
          message: "Company cannot be deleted because it has a supervisor",
        });
      }

      // Elimina la empresa
      await transaction.none("DELETE FROM Company WHERE societydivision=$1", [
        societydivision,
      ]);

      // Agregar una entrada en la tabla de bitácora ("log")
      await transaction.none(
        `INSERT INTO log (username, action, description, timestamp)
            VALUES ($1, $2, $3, $4)`,
        [
          "admin",
          "Eliminar empresa",
          `Eliminada empresa ${societydivision}, nombre: ${companyToDelete.name}`,
          new Date(),
        ]
      );

      res.json({ message: "Company eliminada exitosamente" });
    });
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

  const { username, idCashPoint, office, societydivision } = req.body;
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

  // Si no se recibe la sociedad
  if (!societydivision) {
    return res.status(400).json({ message: "societydivision required" });
  } else {
    // Si la sociedad no es de 2 a 50 caracteres
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
    // Si el password no es de 2 a 100 caracteres
    if (password.length < 2 || password.length > 60) {
      return res
        .status(400)
        .json({ message: "password must be 2 to 60 characters" });
    }

    // Hasheo el password
    password = await hashPassword(password);
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
      let newUser = null;
      // Agrego el supervisor a la base de datos
      newUser = await transaction.one(
        `INSERT INTO Supervisor (idCashPoint, "user", office, password, societydivision)
              VALUES ($1, $2, $3, $4, $5) RETURNING idCashPoint, "user", office, societydivision`,
        [idCashPoint, username, office, password, societydivision]
      );

      // Agregar una entrada en la tabla de bitácora ("log")
      await transaction.none(
        `INSERT INTO log (username, action, description, timestamp)
            VALUES ($1, $2, $3, $4)`,
        [
          "admin",
          "Agregar supervisor",
          `Agregado supervisor ${username}, idCashPoint: ${idCashPoint}, sociedad: ${societydivision}, oficina: ${office}`,
          new Date(),
        ]
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
  const { username, office, societydivision } = req.body;
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

  // Si no se recibe la sociedad
  if (!societydivision) {
    return res.status(400).json({ message: "societydivision required" });
  } else {
    // Si la sociedad no es de 2 a 50 caracteres
    if (societydivision.length < 2 || societydivision.length > 50) {
      return res
        .status(400)
        .json({ message: "societydivision must be 2 to 50 characters" });
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

  // Si el nuevo username ya existe en la tabla de Supervisor o User o Admin
  const userExists = await db.oneOrNone(
    `SELECT $1 AS username FROM Admin WHERE "user" = $1
      UNION
      SELECT $1 AS username FROM Supervisor WHERE "user" = $1 AND idCashPoint <> $2
      UNION
      SELECT username FROM "User" WHERE username = $1;`,
    [username, idCashPoint]
  );

  if (userExists) {
    return res.status(400).json({ message: "Username already exists" });
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
          `UPDATE Supervisor SET "user"=$1, office=$3, societydivision=$4
          WHERE idCashPoint=$2 RETURNING idCashPoint, "user", office, societydivision`,
          [username, idCashPoint, office, societydivision]
        );

        // Agregar una entrada en la tabla de bitácora ("log")
        await transaction.none(
          `INSERT INTO log (username, action, description, timestamp)
            VALUES ($1, $2, $3, $4)`,
          [
            "admin",
            "Actualizar supervisor",
            `Actualizado supervisor ${username}, idCashPoint: ${idCashPoint}, sociedad: ${societydivision}, oficina: ${office}`,
            new Date(),
          ]
        );

        // Devuelve la respuesta exitosa
        return res.json(updatedUser);
      }

      // Realiza la actualización solo si el supervisor existe y hay contraseña
      const updatedUser = await transaction.one(
        `UPDATE Supervisor SET "user"=$1, password=$2, office=$4, societydivision=$5
       WHERE idCashPoint=$3 RETURNING idCashPoint, "user", office, societydivision ORDER BY societydivision, idCashPoint`, // Ordena por sociedad y idCashPoint
        [username, password, idCashPoint, office, societydivision]
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
        `SELECT * FROM Supervisor WHERE idCashPoint = $1 ORDER BY societydivision, idCashPoint`, // Ordena por sociedad y idCashPoint
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

          // Agregar una entrada en la tabla de bitácora ("log")
          await transaction.none(
            `INSERT INTO log (username, action, description, timestamp)
            VALUES ($1, $2, $3, $4)`,
            [
              "admin",
              "Eliminar supervisor",
              `Eliminado supervisor ${supervisorToDelete.user}, idCashPoint: ${idCashPoint}, sociedad: ${supervisorToDelete.societydivision}, oficina: ${supervisorToDelete.office}`,
              new Date(),
            ]
          );
          res.json({ message: "Supervisor eliminado exitosamente" });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta para bloquear o desbloquear un supervisor
router.put("/block/:idCashPoint", verifyToken, async (req, res) => {
  // Si el rol del usuario no es admin
  if (req.user.role !== "admin") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  const idCashPoint = req.params.idCashPoint;
  const { isblocked } = req.body;

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

  // Si no se recibe el isBlocked
  if (isblocked === undefined) {
    return res.status(400).json({ message: "isBlocked required" });
  } else {
    // Si el isBlocked no es booleano
    if (typeof isblocked !== "boolean") {
      return res.status(400).json({ message: "isBlocked must be boolean" });
    }
  }

  try {
    // Actualiza el supervisor
    const updatedSupervisor = await db.one(
      `UPDATE Supervisor SET isBlocked=$1 WHERE idCashPoint=$2 RETURNING idCashPoint, "user", office, societydivision, isBlocked`,
      [isblocked, idCashPoint]
    );

    // Agregar una entrada en la tabla de bitácora ("log")
    await db.none(
      `INSERT INTO log (username, action, description, timestamp)
            VALUES ($1, $2, $3, $4)`,
      [
        "admin",
        // Si el supervisor se bloquea
        isblocked === true ? "Bloquear supervisor" : "Desbloquear supervisor",
        // Si el supervisor se bloquea
        isblocked === true
          ? `Bloqueado supervisor ${updatedSupervisor.user}, idCashPoint: ${idCashPoint}, sociedad: ${updatedSupervisor.societydivision}, oficina: ${updatedSupervisor.office}`
          : `Desbloqueado supervisor ${updatedSupervisor.user}, idCashPoint: ${idCashPoint}, sociedad: ${updatedSupervisor.societydivision}, oficina: ${updatedSupervisor.office}`,
        new Date(),
      ]
    );

    res.json(updatedSupervisor);
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

    const societydivision = req.body.societydivision;

    // Si no se recibe el societydivision
    if (!societydivision) {
      return res.status(400).json({ error: "societydivision required" });
    } else {
      // Si el idCashPoint no es de 2 a 50 caracteres
      if (societydivision.length < 2 || societydivision.length > 21) {
        return res
          .status(400)
          .json({ error: "societydivision must be 2 to 21 characters" });
      }
    }

    // Si existen grupos sin cerrar o cajas cerradas sin enviar no se puede cargar el archivo CSV
    const counts = await db.one(
      `
      SELECT
        (SELECT COUNT(*) 
        FROM PaymentGroup AS PG
        JOIN Supervisor AS S ON PG.idCashPoint = S.idCashPoint
        WHERE S.societydivision = $1) AS open_payment_group_count,
        (SELECT COUNT(*) 
        FROM CashClosing AS CC
        JOIN Supervisor AS S ON CC.idCashPoint = S.idCashPoint
        WHERE S.societydivision = $1) AS closed_cash_closing_count
    `,
      [societydivision]
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
          SELECT * FROM ReversePayment WHERE idCashPoint IN (SELECT S.idCashPoint FROM Supervisor AS S WHERE S.societydivision = $1) ORDER BY fecha_hora DESC
          `,
          [societydivision]
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
        await transaction.none("DELETE FROM Client where societydivision=$1", [
          societydivision,
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
              INSERT INTO Client (PayerContractAccountID, CUEN, name, address, debt, societydivision, parroquia, isdisconnected)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              `,
                [
                  record.CUENTACONTRATO,
                  record.CUEN.substring(0, 10),
                  record.NOMBRE,
                  record.DIRECCION,
                  parseFloat(record.DEUDA.replace(",", ".")),
                  societydivision,
                  record.PARROQUIA,
                  record.ESTADO_DESCONECTADO,
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
        // Agregar una entrada en la tabla de bitácora ("log")
        await db.none(
          `INSERT INTO log (username, action, description, timestamp)
            VALUES ($1, $2, $3, $4)`,
          [
            "admin",
            "Cargar archivo CSV",
            `Cargado archivo CSV, sociedad: ${societydivision}`,
            new Date(),
          ]
        );

        // No hubo errores, envía una respuesta de éxito
        res.status(200).json({ message: "Archivo CSV cargado exitosamente." });
      }
    } catch (error) {
      console.error("Error al cargar el archivo CSV:", error);
      res.status(500).json({ error: "Error al cargar el archivo CSV." });
    }
  }
);

module.exports = router;
