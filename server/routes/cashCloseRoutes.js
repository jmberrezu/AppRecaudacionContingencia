const express = require("express");
const router = express.Router();
const verifyToken = require("../services/verifyToken");
const db = require("../db");

// Obtengo el primer grupo de pago de la caja
router.post("/", verifyToken, async (req, res) => {
  // Si el rol no es cajero o gerente no puede acceder a esta ruta
  if (req.user.role !== "cajero" && req.user.role !== "gerente") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  let { idcashpoint, idvirtualcashpoint } = req.body;

  // Si el idcashPoint no se ha ingresado
  if (!idcashpoint) {
    return res.status(400).json({ message: "idcashPoint is required" });
  }

  // Si el idcashPoint no es de 16 o 21 caracteres
  if (idcashpoint.length !== 16 && idcashpoint.length !== 21) {
    return res
      .status(400)
      .json({ message: "idcashPoint must be 16 or 21 characters" });
  }

  // Si no existe el idcashPoint
  const idCashPointResult = await db.oneOrNone(
    "SELECT idCashPoint FROM Supervisor WHERE idCashPoint = $1",
    [idcashpoint]
  );

  if (!idCashPointResult) {
    return res.status(400).json({ message: "idcashPoint does not exist" });
  }

  // Si el idvirtualcashpoint no se ha ingresado y no es un numero
  if (!idvirtualcashpoint || isNaN(idvirtualcashpoint)) {
    return res.status(400).json({ message: "idvirtualcashpoint is required" });
  }

  try {
    //Obtengo los pagos de la caja ordenados por fecha
    let results = await db.query(
      `SELECT * FROM PaymentGroup WHERE idCashPoint = $1 AND idVirtualCashPoint = $2 ORDER BY valueDate`,
      [idcashpoint, idvirtualcashpoint]
    );

    if (results.length === 0) {
      return res.status(404).json({
        error:
          "It is not possible to close the cash register if no payment has been made.",
      });
    }

    // Si el grupo de pago tiene fecha del dia siguiente, retrona error
    let fechaDiaSiguiente = new Date();
    fechaDiaSiguiente.setDate(fechaDiaSiguiente.getDate() + 1);
    let fechaGrupo = new Date(results[0].valuedate);

    if (
      fechaDiaSiguiente.toISOString().slice(0, 10) ===
      fechaGrupo.toISOString().slice(0, 10)
    ) {
      return res.status(400).json({
        error:
          "No se puede cerrar la caja porque se encuentra en el grupo de pago con fecha del día: " +
          fechaGrupo.toISOString().slice(0, 10),
      });
    }

    // Obtengo todos los pagos del grupo y los sumo
    const query2 = `SELECT SUM(CAST(paymentAmountCurrencyCode AS NUMERIC)) AS total_sumado FROM Payment WHERE CashPointPaymentGroupReferenceID = $1;`;

    let total_sumado = await db.one(query2, [
      results[0].cashpointpaymentgroupreferenceid,
    ]);

    results[0].total_sumado = total_sumado.total_sumado;

    // Si la fecha es menor a la fecha actual, se adjunta una alerta de que se esta cerrando caja de un dia previo
    if (
      fechaGrupo.toISOString().slice(0, 10) <
      new Date().toISOString().slice(0, 10)
    ) {
      results[0].alerta = true;
    }

    res.json(results[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving data" });
  }
});

// Cierro la caja
router.post("/close", verifyToken, async (req, res) => {
  // Si el rol no es cajero o gerente no puede acceder a esta ruta
  if (req.user.role !== "cajero" && req.user.role !== "gerente") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  const { grupo, dolares, centavos, idglobalvirtualcashpoint } = req.body;

  // Si el idglobalvirtualcashpoint no se ha ingresado y no es un numero
  if (!idglobalvirtualcashpoint || isNaN(idglobalvirtualcashpoint)) {
    return res
      .status(400)
      .json({ message: "idglobalvirtualcashpoint is required" });
  }

  // Si el idglobalvirtualcashpoint no existe
  const idGlobalVirtualCashPointResult = await db.oneOrNone(
    "SELECT idGlobalVirtualCashPoint FROM VirtualCashPoint WHERE idGlobalVirtualCashPoint = $1",
    [idglobalvirtualcashpoint]
  );

  if (!idGlobalVirtualCashPointResult) {
    return res
      .status(400)
      .json({ message: "idglobalvirtualcashpoint does not exist" });
  }

  // Si el grupo de pago no se ha ingresado
  if (!grupo) {
    return res.status(400).json({ message: "grupo is required" });
  }

  // Si el grupo no contiene cashpointpaymentgroupreferenceid, idcashpoint, idvirtualcashpoint, valuedate
  if (
    !grupo.cashpointpaymentgroupreferenceid ||
    !grupo.idcashpoint ||
    !grupo.idvirtualcashpoint ||
    !grupo.valuedate
  ) {
    return res.status(400).json({
      message:
        "grupo must contain cashpointpaymentgroupreferenceid, idcashpoint, idvirtualcashpoint, valuedate",
    });
  }

  // Si el grupo de pago no existe
  const grupoResult = await db.oneOrNone(
    "SELECT * FROM PaymentGroup WHERE CashPointPaymentGroupReferenceID = $1",
    [grupo.cashpointpaymentgroupreferenceid]
  );

  if (!grupoResult) {
    return res.status(400).json({ message: "grupo does not exist" });
  }

  // Si el grupo de pago no pertenece a la caja del usuario si es cajero
  if (
    req.user.role === "cajero" &&
    grupoResult.idcashpoint !== req.user.idcashpoint
  ) {
    return res.status(401).json({
      message: "Unauthorized User",
    });
  }

  // Si no se ha recibido el monto en dolares y centavos
  if (!dolares || !centavos) {
    return res
      .status(400)
      .json({ message: "dolares and centavos are required" });
  }

  let result = {};

  try {
    await db.tx(async (transaction) => {
      await transaction.manyOrNone(
        `INSERT INTO CashClosing (valueDate, closingdoccumentamount, idCashPoint, CashPointPaymentGroupReferenceID, idGlobalVirtualCashPoint, isSent) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          grupo.valuedate,
          dolares + "." + centavos,
          grupo.idcashpoint,
          grupo.cashpointpaymentgroupreferenceid,
          idglobalvirtualcashpoint.toString(),
          false,
        ]
      );

      // Elimino el grupo de pago de la caja
      await transaction.manyOrNone(
        `DELETE FROM PaymentGroup WHERE CashPointPaymentGroupReferenceID = $1`,
        [grupo.cashpointpaymentgroupreferenceid]
      );

      // Obtengo todos los pagos del grupo y los sumo
      result = await transaction.one(
        `
    SELECT 
        COUNT(*) AS total_pagos,
        SUM(CAST(paymentAmountCurrencyCode AS NUMERIC)) AS total_sumado
    FROM Payment
    WHERE CashPointPaymentGroupReferenceID = $1;`,
        [grupo.cashpointpaymentgroupreferenceid]
      );
    });

    if (
      parseFloat(result.total_sumado) !== parseFloat(dolares + "." + centavos)
    ) {
      return res.status(400).json({
        error:
          "El monto ingresado no coincide con la suma de los pagos del grupo.",
        total_sumado: result.total_sumado,
        total_pagos: result.total_pagos,
      });
    }

    res.json({
      message: "Caja cerrada con éxito",
      total_sumado: result.total_sumado,
      total_pagos: result.total_pagos,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving data" });
  }
});

// Obtengo las cajas cerradas
router.get("/closedcash/:idcashpoint", verifyToken, async (req, res) => {
  // Si el rol no es cajero o gerente no puede acceder a esta ruta
  if (req.user.role !== "cajero" && req.user.role !== "gerente") {
    return res.status(401).json({ message: "Unauthorized User" });
  }

  const { idcashpoint } = req.params;

  // Si el idcashPoint no se ha ingresado
  if (!idcashpoint) {
    return res.status(400).json({ message: "idcashPoint is required" });
  }

  // Si el idglobalvirtualcashpoint no se ha ingresado y no es un numero
  if (!req.user.idglobalvirtualcashpoint) {
    return res
      .status(400)
      .json({ message: "idglobalvirtualcashpoint is required" });
  }

  try {
    //Si es cajero solo puede ver las cajas cerradas de su caja
    if (req.user.role === "cajero") {
      const results = await db.query(
        `SELECT CashClosing.*,
        VirtualCashPoint.idVirtualCashPoint,
            VirtualCashPoint.name AS virtualCashPointName
        FROM CashClosing
        INNER JOIN VirtualCashPoint ON CashClosing.idGlobalVirtualCashPoint = VirtualCashPoint.idGlobalVirtualCashPoint
        WHERE CashClosing.idCashPoint = $1 AND CashClosing.idGlobalVirtualCashPoint = $2`,
        [idcashpoint, req.user.idglobalvirtualcashpoint]
      );

      return res.json(results);
    }

    const results = await db.query(
      `SELECT CashClosing.*,
        VirtualCashPoint.idVirtualCashPoint,
            VirtualCashPoint.name AS virtualCashPointName
        FROM CashClosing
        INNER JOIN VirtualCashPoint ON CashClosing.idGlobalVirtualCashPoint = VirtualCashPoint.idGlobalVirtualCashPoint
        WHERE CashClosing.idCashPoint = $1`,
      [idcashpoint]
    );

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving data" });
  }
});

// Obtengo las cajas cerradas con pagos
router.get(
  "/closedcashwithpayments/:idcashpoint",
  verifyToken,
  async (req, res) => {
    // Si el rol no es cajero o gerente no puede acceder a esta ruta
    if (req.user.role !== "cajero" && req.user.role !== "gerente") {
      return res.status(401).json({ message: "Unauthorized User" });
    }

    const { idcashpoint } = req.params;

    // Si el idcashPoint no se ha ingresado
    if (!idcashpoint) {
      return res.status(400).json({ message: "idcashPoint is required" });
    }

    // Si el idglobalvirtualcashpoint no se ha ingresado y no es un numero
    if (!req.user.idglobalvirtualcashpoint) {
      return res
        .status(400)
        .json({ message: "idglobalvirtualcashpoint is required" });
    }

    try {
      //Si es cajero solo puede ver las cajas cerradas de su caja
      if (req.user.role === "cajero") {
        const results = await db.query(
          `SELECT CashClosing.*,
        VirtualCashPoint.idVirtualCashPoint,
            VirtualCashPoint.name AS virtualCashPointName
        FROM CashClosing
        INNER JOIN VirtualCashPoint ON CashClosing.idGlobalVirtualCashPoint = VirtualCashPoint.idGlobalVirtualCashPoint
        WHERE CashClosing.idCashPoint = $1 AND CashClosing.idGlobalVirtualCashPoint = $2`,
          [idcashpoint, req.user.idglobalvirtualcashpoint]
        );

        // Obtengo los pagos de cada caja cerrada
        for (let i = 0; i < results.length; i++) {
          const pagos = await db.query(
            `SELECT
            Payment.*,
            VirtualCashPoint.idVirtualCashPoint,
            VirtualCashPoint.name AS virtualCashPointName,
            "User".username
          FROM Payment
          INNER JOIN VirtualCashPoint ON Payment.idGlobalVirtualCashPoint = VirtualCashPoint.idGlobalVirtualCashPoint
          INNER JOIN "User" ON Payment.idGlobalUser = "User".idGlobalUser
          WHERE CashPointPaymentGroupReferenceID=$1`,
            [results[i].cashpointpaymentgroupreferenceid]
          );

          results[i].pagos = pagos;
        }

        return res.json(results);
      }

      const results = await db.query(
        `SELECT CashClosing.*,
        VirtualCashPoint.idVirtualCashPoint,
            VirtualCashPoint.name AS virtualCashPointName
        FROM CashClosing
        INNER JOIN VirtualCashPoint ON CashClosing.idGlobalVirtualCashPoint = VirtualCashPoint.idGlobalVirtualCashPoint
        WHERE CashClosing.idCashPoint = $1`,
        [idcashpoint]
      );

      // Obtengo los pagos de cada caja cerrada
      for (let i = 0; i < results.length; i++) {
        const pagos = await db.query(
          `SELECT
          Payment.*,
          VirtualCashPoint.idVirtualCashPoint,
          VirtualCashPoint.name AS virtualCashPointName,
          "User".username
        FROM Payment
        INNER JOIN VirtualCashPoint ON Payment.idGlobalVirtualCashPoint = VirtualCashPoint.idGlobalVirtualCashPoint
        INNER JOIN "User" ON Payment.idGlobalUser = "User".idGlobalUser
        WHERE CashPointPaymentGroupReferenceID = $1;
      `,

          [results[i].cashpointpaymentgroupreferenceid]
        );

        results[i].pagos = pagos;
      }

      res.json(results);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error retrieving data" });
    }
  }
);

// Anulo el cierre de caja
router.put(
  "/anular-cierre-caja/:cashpointpaymentgroupreferenceid",
  verifyToken,
  async (req, res) => {
    // Si el rol no es gerente no puede acceder a esta ruta
    if (req.user.role !== "gerente") {
      return res.status(401).json({ message: "Unauthorized User" });
    }

    const { cashpointpaymentgroupreferenceid } = req.params;
    const { user } = req.body;

    // Si el user no se ha ingresado
    if (!user) {
      return res.status(400).json({ message: "user is required" });
    }

    // Si el user no contiene idcashpoint
    if (!user.idcashpoint) {
      return res.status(400).json({ message: "user must contain idcashpoint" });
    }

    try {
      await db.tx(async (transaction) => {
        // Abro el grupo de pago
        await transaction.none(
          `INSERT INTO PaymentGroup (CashPointPaymentGroupReferenceID, valueDate, idCashPoint, idVirtualCashPoint)
      VALUES ($1, $2, $3, $4);`,
          [
            cashpointpaymentgroupreferenceid,
            cashpointpaymentgroupreferenceid.split("-")[1].substring(0, 8),
            user.idcashpoint,
            cashpointpaymentgroupreferenceid.split("-")[1].substring(8, 12),
          ]
        );

        // Elimino el cierre de caja

        await transaction.none(
          `DELETE FROM CashClosing WHERE CashPointPaymentGroupReferenceID = $1`,
          [cashpointpaymentgroupreferenceid]
        );
      });

      res.status(200).json({ message: "Cierre de caja anulado correctamente" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error en el servidor" });
    }
  }
);

module.exports = router;
