const express = require("express");
const router = express.Router();
const db = require("../db"); // Asumiendo que db.js exporta la instancia de la base de datos

const verifyToken = require("./verifyToken"); // Importa el middleware

// Implementa una función para generar un ID único
function generatePaymentTransactionID(
  fecha,
  idUser,
  idVirtualCashPoint,
  idCashPoint,
  lastSeq
) {
  // Obtener los 5 caracteres de la oficina del idcashpoint
  const officeCode = idCashPoint.split("-")[1] + idCashPoint.split("-")[2];

  // Obtener la fecha actual en formato AAAAMMDD

  const currentDate = fecha.toISOString().slice(0, 10).replace(/-/g, "");

  // Tomar los últimos 3 dígitos de idUser y rellenar con ceros a la izquierda
  const formattedUserId = idUser.toString().slice(-3).padStart(3, "0");
  // Tomar los últimos 3 dígitos de idVirtualCashPoint y rellenar con ceros a la izquierda
  const formattedVirtualCashPointId = idVirtualCashPoint
    .toString()
    .slice(-3)
    .padStart(3, "0");

  // Completar el secuencial con ceros a la izquierda hasta 6 caracteres
  const formattedSecuencial = lastSeq.toString().padStart(6, "0");
  // Componer el ID del pago
  const paymentTransactionID = `PID-${officeCode}-${currentDate}-${formattedUserId}${formattedVirtualCashPointId}${formattedSecuencial}`;

  return paymentTransactionID;
}

// Ruta protegida que solo puede ser accedida por usuarios autenticados
router.get("/buscar-cliente/:cuentaContrato", verifyToken, async (req, res) => {
  const { cuentaContrato } = req.params;

  try {
    const query =
      "SELECT * FROM Client WHERE PayerContractAccountID = $1 OR CUEN = $1;";
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

    let lastSeq = 1; // Valor predeterminado si no hay registro en la tabla
    if (lastSeqResult) {
      lastSeq = lastSeqResult.lastseq;
    }

    const paymentTransactionID = generatePaymentTransactionID(
      fecha,
      user.id,
      user.idvirtualcashpoint,
      user.idcashpoint,
      lastSeq
    );

    const insertQuery = `
          INSERT INTO Payment (PaymentTransactionID, valueDate, paymentAmountCurrencyCode, PayerContractAccountID, idUser, idVirtualCashPoint, idCashPoint)
          VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
        `;

    await db.none(insertQuery, [
      paymentTransactionID,
      cantidadTotal,
      cuentaContrato,
      user.id,
      user.idvirtualcashpoint,
      user.idcashpoint,
    ]);

    // Actualizar el secuencial en la tabla LastPaymentSeq
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

    res.status(200).json({
      message: "Pago realizado con éxito.",
      date: fecha.toISOString().slice(0, 10), // Fecha actual en formato AAAA-MM-DD
      amount: cantidadTotal,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Error en el servidor al procesar el pago." });
  }
});

module.exports = router;
