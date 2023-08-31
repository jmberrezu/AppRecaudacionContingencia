const express = require("express");
const router = express.Router();
const verifyToken = require("../services/verifyToken");
const db = require("../db");

// Obtengo los grupos de pago de la caja ordenados por fecha
router.post("/", verifyToken, async (req, res) => {
  let { idcashpoint, idvirtualcashpoint } = req.body;

  try {
    //Obtengo los pagos de la caja ordenados por fecha
    const query = `SELECT * FROM PaymentGroup WHERE idCashPoint = $1 AND idVirtualCashPoint = $2 ORDER BY valueDate`;

    let results = await db.query(query, [idcashpoint, idvirtualcashpoint]);

    if (results.length === 0) {
      return res.status(404).json({
        error: "No se puede cerrar caja si no se ha realizado ningún pago",
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

    res.json(results[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving data" });
  }
});

// Cierro la caja
router.post("/close", verifyToken, async (req, res) => {
  const { grupo, dolares, centavos, idglobalvirtualcashpoint } = req.body;

  try {
    const query = `INSERT INTO CashClosing (valueDate, closingdoccumentamount, idCashPoint, CashPointPaymentGroupReferenceID, idGlobalVirtualCashPoint, isSent) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;

    await db.manyOrNone(query, [
      grupo.valuedate,
      dolares + "." + centavos,
      grupo.idcashpoint,
      grupo.cashpointpaymentgroupreferenceid,
      idglobalvirtualcashpoint.toString(),
      false,
    ]);

    // Elimino el grupo de pago de la caja
    const query2 = `DELETE FROM PaymentGroup WHERE CashPointPaymentGroupReferenceID = $1`;

    await db.manyOrNone(query2, [grupo.cashpointpaymentgroupreferenceid]);

    // Obtengo todos los pagos del grupo y los sumo
    const query3 = `
    SELECT 
        COUNT(*) AS total_pagos,
        SUM(CAST(paymentAmountCurrencyCode AS NUMERIC)) AS total_sumado
    FROM Payment
    WHERE CashPointPaymentGroupReferenceID = $1;`;

    let result = await db.one(query3, [grupo.cashpointpaymentgroupreferenceid]);

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
  const { idcashpoint } = req.params;

  try {
    const query = `SELECT CashClosing.*,
    VirtualCashPoint.idVirtualCashPoint,
        VirtualCashPoint.name AS virtualCashPointName
    FROM CashClosing
    INNER JOIN VirtualCashPoint ON CashClosing.idGlobalVirtualCashPoint = VirtualCashPoint.idGlobalVirtualCashPoint
    WHERE CashClosing.idCashPoint = $1`;

    const results = await db.query(query, [idcashpoint]);

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving data" });
  }
});

// Anulo el cierre de caja
router.put(
  "/anular-cierre-caja/:cashpointpaymentgroupreferenceid",
  verifyToken,
  async (req, res) => {
    const { cashpointpaymentgroupreferenceid } = req.params;
    const { user } = req.body;

    try {
      // Abro el grupo de pago
      const query = `INSERT INTO PaymentGroup (CashPointPaymentGroupReferenceID, valueDate, idCashPoint, idVirtualCashPoint)
      VALUES ($1, $2, $3, $4);`;

      await db.none(query, [
        cashpointpaymentgroupreferenceid,
        cashpointpaymentgroupreferenceid.split("-")[1].substring(0, 8),
        user.idcashpoint,
        cashpointpaymentgroupreferenceid.split("-")[1].substring(8, 12),
      ]);

      // Elimino el cierre de caja

      const query2 = `DELETE FROM CashClosing WHERE CashPointPaymentGroupReferenceID = $1`;

      await db.none(query2, [cashpointpaymentgroupreferenceid]);

      res.status(200).json({ message: "Cierre de caja anulado correctamente" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error en el servidor" });
    }
  }
);

module.exports = router;
