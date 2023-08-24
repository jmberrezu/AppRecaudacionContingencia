const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("./verifyToken");

// Función para generar un ID único de transacción de pago
function generatePaymentTransactionID(
  officeCode,
  currentDate,
  formattedUserId,
  formattedVirtualCashPointId,
  formattedSecuencial
) {
  return `PID-${officeCode}-${currentDate}-${formattedUserId}${formattedVirtualCashPointId}${formattedSecuencial}`;
}

// Ruta protegida: Buscar cliente por cuenta o contrato
router.get("/buscar-cliente/:cuentaContrato", verifyToken, async (req, res) => {
  const { cuentaContrato } = req.params;

  try {
    const query = `
      SELECT * FROM Client
      WHERE PayerContractAccountID = $1 OR CUEN = $1;
    `;

    const client = await db.any(query, [cuentaContrato]);

    if (client.length === 1) {
      res.status(200).json(client[0]);
    } else {
      res.status(404).json({ message: "Cliente no encontrado" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Ruta protegida: Realizar pago
router.post("/realizar-pago", verifyToken, async (req, res) => {
  const { cantidadTotal, cuentaContrato, user } = req.body;
  const fecha = new Date();

  try {
    const getSeqQuery = `
      SELECT LastSeq
      FROM LastPaymentSeq
      WHERE UserId = $1 AND VirtualCashPointId = $2;
    `;

    const lastSeqResult = await db.oneOrNone(getSeqQuery, [
      user.id,
      user.idvirtualcashpoint,
    ]);

    const lastSeq = lastSeqResult ? lastSeqResult.lastseq : 1;

    const paymentTransactionID = generatePaymentTransactionID(
      user.idcashpoint.split("-")[1] + user.idcashpoint.split("-")[2],
      fecha.toISOString().slice(0, 10).replace(/-/g, ""),
      user.id.toString().slice(-3).padStart(3, "0"),
      user.idvirtualcashpoint.toString().slice(-3).padStart(3, "0"),
      lastSeq.toString().padStart(6, "0")
    );

    const insertQuery = `
      INSERT INTO Payment (
        PaymentTransactionID, valueDate, paymentAmountCurrencyCode,
        PayerContractAccountID, idUser, idVirtualCashPoint, idCashPoint
      )
      VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6);
    `;

    await db.none(insertQuery, [
      paymentTransactionID,
      cantidadTotal,
      cuentaContrato,
      user.id,
      user.idvirtualcashpoint,
      user.idcashpoint,
    ]);

    const updateSeqQuery = `
      INSERT INTO LastPaymentSeq (UserId, VirtualCashPointId, LastSeq)
      VALUES ($1, $2, $3)
      ON CONFLICT (UserId, VirtualCashPointId)
      DO UPDATE SET LastSeq = $3;
    `;

    await db.none(updateSeqQuery, [
      user.id,
      user.idvirtualcashpoint,
      lastSeq + 1,
    ]);

    const updateDebtQuery = `
      UPDATE Client
      SET Debt = Debt - $1
      WHERE PayerContractAccountID = $2 OR CUEN = $2;
    `;

    await db.none(updateDebtQuery, [cantidadTotal, cuentaContrato]);

    res.status(200).json({
      message: "Pago realizado con éxito.",
      date: fecha.toISOString().slice(0, 10),
      amount: cantidadTotal,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Error en el servidor al procesar el pago." });
  }
});

// Ruta protegida: Obtener lista de pagos
router.get("/pagos", verifyToken, async (req, res) => {
  try {
    const query = `
      SELECT * FROM Payment;
    `;

    const payments = await db.any(query);

    res.status(200).json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
