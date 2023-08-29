const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("./verifyToken");

// Función para generar un ID único de transacción de pago
function generatePaymentTransactionID(
  ajuste,
  officeCode,
  currentDate,
  formattedUserId,
  formattedVirtualCashPointId,
  formattedSecuencial
) {
  return `PID-${officeCode}-${currentDate}-${ajuste}${formattedUserId}${formattedVirtualCashPointId}${formattedSecuencial}`;
}

function generateGroupID(officeCode, currentDate, formattedVirtualCashPointId) {
  return `${officeCode}-${currentDate}${formattedVirtualCashPointId}`;
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
    let groupID = generateGroupID(
      user.idcashpoint.split("-")[1] + user.idcashpoint.split("-")[2],
      fecha.toISOString().slice(0, 10).replace(/-/g, ""),
      user.idvirtualcashpoint.toString().slice(-2).padStart(2, "0")
    );

    // Verificar si el PaymentGroup ya está en CashClosing
    const checkCashClosingQuery = `
      SELECT CashPointPaymentGroupReferenceID
      FROM CashClosing
      WHERE CashPointPaymentGroupReferenceID = $1;
    `;

    const cashClosingExists = await db.oneOrNone(checkCashClosingQuery, [
      groupID,
    ]);

    let fecha_cash = fecha;

    //Si existe un CashClosing con el PaymentGroup, el groupID tiene que ser del dia siguiente
    if (cashClosingExists) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      groupID = generateGroupID(
        user.idcashpoint.split("-")[1] + user.idcashpoint.split("-")[2],
        tomorrow.toISOString().slice(0, 10).replace(/-/g, ""),
        user.idvirtualcashpoint.toString().slice(-2).padStart(2, "0")
      );

      // Si existe un CashClosing con el PaymentGroup al dia siguiente, retorna error
      const checkCashClosingQuery2 = `
      SELECT CashPointPaymentGroupReferenceID
      FROM CashClosing
      WHERE CashPointPaymentGroupReferenceID = $1;
    `;

      const cashClosingExists2 = await db.oneOrNone(checkCashClosingQuery2, [
        groupID,
      ]);

      if (cashClosingExists2) {
        return res.status(400).json({
          error:
            "No se puede realizar el pago porque ya se cerró la caja del día " +
            tomorrow.toISOString().slice(0, 10),
        });
      }
      fecha_cash = tomorrow;
    }

    const insertGroupIDQuery = `
    INSERT INTO PaymentGroup (CashPointPaymentGroupReferenceID, valueDate, idCashPoint, idVirtualCashPoint)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (CashPointPaymentGroupReferenceID)
    DO NOTHING;
  `;
    await db.none(insertGroupIDQuery, [
      groupID,
      fecha_cash.toISOString().slice(0, 10).replace(/-/g, ""),
      user.idcashpoint,
      user.idvirtualcashpoint,
    ]);

    //--------------------

    const getSeqQuery = `
      SELECT LastSeq
      FROM LastPaymentSeq
      WHERE SeqDate = $1 AND UserId = $2 AND VirtualCashPointId = $3;
    `;

    const lastSeqResult = await db.oneOrNone(getSeqQuery, [
      fecha.toISOString().slice(0, 10),
      user.idglobaluser,
      user.idglobalvirtualcashpoint,
    ]);

    const lastSeq = lastSeqResult ? lastSeqResult.lastseq : 1;

    const paymentTransactionID = generatePaymentTransactionID(
      (ajuste = "0"), // Si existiese ajuste, se cambia a "A" -- Por Implementar
      user.idcashpoint.split("-")[1] + user.idcashpoint.split("-")[2],
      fecha.toISOString().slice(0, 10).replace(/-/g, ""),
      user.id.toString().slice(-3).padStart(3, "0"),
      user.idvirtualcashpoint.toString().slice(-3).padStart(2, "0"),
      lastSeq.toString().padStart(6, "0")
    );

    const insertQuery = `
      INSERT INTO Payment (
        PaymentTransactionID, valueDate, paymentAmountCurrencyCode,
        PayerContractAccountID, idGlobalUser, CashPointPaymentGroupReferenceID, idGlobalVirtualCashPoint, idCashPoint
      )
      VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7);
    `;

    await db.none(insertQuery, [
      paymentTransactionID,
      cantidadTotal,
      cuentaContrato,
      user.idglobaluser,
      groupID,
      user.idglobalvirtualcashpoint,
      user.idcashpoint,
    ]);

    const updateSeqQuery = `
      INSERT INTO LastPaymentSeq (SeqDate, UserId, VirtualCashPointId, LastSeq)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (SeqDate, UserId, VirtualCashPointId)
      DO UPDATE SET LastSeq = $4;
    `;

    await db.none(updateSeqQuery, [
      fecha.toISOString().slice(0, 10),
      user.idglobaluser,
      user.idglobalvirtualcashpoint,
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
router.get("/pagos/:idcashPoint", verifyToken, async (req, res) => {
  const idcashPoint = req.params.idcashPoint;
  try {
    const query = `
      SELECT 
        Payment.*,
        VirtualCashPoint.idVirtualCashPoint,
        VirtualCashPoint.name AS virtualCashPointName,
        "User".username
      FROM Payment
      INNER JOIN VirtualCashPoint ON Payment.idGlobalVirtualCashPoint = VirtualCashPoint.idGlobalVirtualCashPoint
      INNER JOIN "User" ON Payment.idGlobalUser = "User".idGlobalUser
      WHERE Payment.idCashPoint=$1;
    `;

    const payments = await db.any(query, [idcashPoint]);

    res.status(200).json(payments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

//Ruta para anular pago
router.put("/anular-pago/:PID", verifyToken, async (req, res) => {
  const { PID } = req.params;
  const { user, ammount, contractaccount } = req.body;

  try {
    //Quito de la tabla de pagos
    const query = `
      DELETE FROM Payment
      WHERE PaymentTransactionID = $1;
    `;
    await db.none(query, [PID]);

    //Agrego a la tabla de anulaciones, incluyendo la fecha y hora actual
    const insertQuery = `
      INSERT INTO ReversePayment (
        PaymentTransactionID, idGlobalUser, fecha_hora
      )
      VALUES ($1, $2, NOW());
    `;
    await db.none(insertQuery, [PID, user.idglobaluser]);

    //Actualizo la deuda del cliente
    const updateDebtQuery = `
      UPDATE Client
      SET debt = debt + $1
      WHERE PayerContractAccountID = $2;
    `;
    await db.none(updateDebtQuery, [ammount, contractaccount]);

    res.status(200).json({ message: "Pago anulado con éxito." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
