const express = require("express");
const router = express.Router();
const verifyToken = require("./verifyToken");
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

module.exports = router;
