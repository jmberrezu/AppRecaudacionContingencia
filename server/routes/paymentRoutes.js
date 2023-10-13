const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../services/verifyToken");
const fs = require("fs");

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

// Función para generar un ID único de grupo de pago
function generateGroupID(officeCode, currentDate, formattedVirtualCashPointId) {
  return `${officeCode}-${currentDate}${formattedVirtualCashPointId}`;
}

// Ruta protegida: Buscar cliente por cuenta o contrato
router.get("/buscar-cliente/:cuentaContrato", verifyToken, async (req, res) => {
  // Verificar que el usuario sea cajero o gerente
  if (req.user.role !== "cajero" && req.user.role !== "gerente") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { cuentaContrato } = req.params;
  const societydivision = req.user.societydivision;

  // Si no se ha proporcionado una cuenta contrato o CUEN
  if (!cuentaContrato) {
    return res.status(400).json({ message: "Cuenta contrato o CUEN" });
  }

  // Si la cuenta contrato o CUEN no es un número de 10 o 12 dígitos
  if (
    isNaN(cuentaContrato) ||
    (cuentaContrato.length !== 10 && cuentaContrato.length !== 12)
  ) {
    return res.status(400).json({ message: "Cuenta contrato o CUEN inválida" });
  }

  // Si no se ha proporcionado un societydivision
  if (!societydivision) {
    return res.status(400).json({ message: "Societydivision" });
  }

  try {
    // Buscar el cliente por idcashpoint y (cuenta contrato o CUEN)
    const client = await db.oneOrNone(
      `
      SELECT * FROM Client
      WHERE societydivision = $1 AND (PayerContractAccountID = $2 OR CUEN = $2);
    `,
      [societydivision, cuentaContrato]
    );

    // Si el cliente existe
    if (client) {
      res.status(200).json(client);
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
  // Verificar que el usuario sea cajero o gerente
  if (req.user.role !== "cajero" && req.user.role !== "gerente") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { cantidadTotal, cuentaContrato, user } = req.body;
  const fecha = new Date();

  // Si no se ha proporcionado una cuenta contrato o CUEN
  if (!cuentaContrato) {
    return res
      .status(400)
      .json({ message: "No contract account or CUEN entered" });
  } else {
    // Si la cuenta contrato o CUEN no es un número de 10 o 12 dígitos
    if (
      isNaN(cuentaContrato) ||
      (cuentaContrato.length !== 10 && cuentaContrato.length !== 12)
    ) {
      return res
        .status(400)
        .json({ message: "Invalid contract account or CUEN" });
    }
  }

  // Si no se ha proporcionado una cantidad total
  if (!cantidadTotal) {
    return res.status(400).json({ message: "No total amount entered" });
  } else {
    // Si la cantidad total no es un número
    if (isNaN(cantidadTotal)) {
      return res.status(400).json({ message: "Invalid total amount" });
    }
  }

  // Si no se ha proporcionado un usuario
  if (!user) {
    return res.status(400).json({ message: "No user entered" });
  } else {
    // Si el usuario no tiene un id o idcashpoint o idvirtualcashpoint idglobaluser o idglobalvirtualcashpoint
    if (
      !user.id ||
      !user.idcashpoint ||
      !user.idvirtualcashpoint ||
      !user.idglobaluser ||
      !user.idglobalvirtualcashpoint
    ) {
      return res.status(400).json({ message: "Invalid user" });
    }
  }
  let PID = "";

  try {
    await db.tx(async (transaction) => {
      // Verificar si el cliente existe
      const client = await transaction.oneOrNone(
        `
      SELECT * FROM Client
      WHERE PayerContractAccountID = $1 OR CUEN = $1;
    `,
        [cuentaContrato]
      );

      // Si el cliente no existe
      if (!client) {
        return res.status(404).json({
          message: "No client found.",
        });
      }

      let groupID = generateGroupID(
        user.idcashpoint.split("-")[1] + user.idcashpoint.split("-")[2],
        fecha.toISOString().slice(0, 10).replace(/-/g, ""),
        user.idvirtualcashpoint.toString().slice(-2).padStart(2, "0")
      );

      // Verificar si el PaymentGroup ya está en CashClosing
      const cashClosingExists = await transaction.oneOrNone(
        `
      SELECT CashPointPaymentGroupReferenceID
      FROM CashClosing
      WHERE CashPointPaymentGroupReferenceID = $1;
    `,
        [groupID]
      );

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
        const cashClosingExists2 = await transaction.oneOrNone(
          `
      SELECT CashPointPaymentGroupReferenceID
      FROM CashClosing
      WHERE CashPointPaymentGroupReferenceID = $1;
    `,
          [groupID]
        );

        if (cashClosingExists2) {
          return res.status(400).json({
            error:
              "No se puede realizar el pago porque ya se cerró la caja del día " +
              tomorrow.toISOString().slice(0, 10),
          });
        }
        fecha_cash = tomorrow;
      }

      await transaction.none(
        `
    INSERT INTO PaymentGroup (CashPointPaymentGroupReferenceID, valueDate, idCashPoint, idVirtualCashPoint)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (CashPointPaymentGroupReferenceID)
    DO NOTHING;
  `,
        [
          groupID,
          fecha_cash.toISOString().slice(0, 10).replace(/-/g, ""),
          user.idcashpoint,
          user.idvirtualcashpoint,
        ]
      );

      //--------------------

      const lastSeqResult = await transaction.oneOrNone(
        `
      SELECT LastSeq
      FROM LastPaymentSeq
      WHERE SeqDate = $1 AND UserId = $2 AND VirtualCashPointId = $3;
    `,
        [
          fecha.toISOString().slice(0, 10),
          user.idglobaluser,
          user.idglobalvirtualcashpoint,
        ]
      );

      const lastSeq = lastSeqResult ? lastSeqResult.lastseq : 1;

      const paymentTransactionID = generatePaymentTransactionID(
        (ajuste = "0"), // Si existiese ajuste, se cambia a "A" -- Por Implementar
        user.idcashpoint.split("-")[1] + user.idcashpoint.split("-")[2],
        fecha.toISOString().slice(0, 10).replace(/-/g, ""),
        user.id.toString().slice(-3).padStart(3, "0"),
        user.idvirtualcashpoint.toString().slice(-3).padStart(2, "0"),
        lastSeq.toString().padStart(6, "0")
      );

      await transaction.none(
        `
      INSERT INTO Payment (
        PaymentTransactionID, valueDate, paymentAmountCurrencyCode,
        PayerContractAccountID, idGlobalUser, CashPointPaymentGroupReferenceID, idGlobalVirtualCashPoint, idCashPoint
      )
      VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7);
    `,
        [
          paymentTransactionID,
          cantidadTotal,
          cuentaContrato,
          user.idglobaluser,
          groupID,
          user.idglobalvirtualcashpoint,
          user.idcashpoint,
        ]
      );

      PID = paymentTransactionID;

      await transaction.none(
        `
      INSERT INTO LastPaymentSeq (SeqDate, UserId, VirtualCashPointId, LastSeq)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (SeqDate, UserId, VirtualCashPointId)
      DO UPDATE SET LastSeq = $4;
    `,
        [
          fecha.toISOString().slice(0, 10),
          user.idglobaluser,
          user.idglobalvirtualcashpoint,
          lastSeq + 1,
        ]
      );

      await transaction.none(
        `
      UPDATE Client
      SET Debt = Debt - $1
      WHERE PayerContractAccountID = $2 OR CUEN = $2;
    `,
        [cantidadTotal, cuentaContrato]
      );
    });

    res.status(200).json({
      message: "Pago realizado con éxito.",
      date: fecha.toISOString().slice(0, 10),
      time: fecha.toISOString().slice(11, 19),
      amount: cantidadTotal,
      pid: PID,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Error en el servidor al procesar el pago." });
  }
});

//Ruta para anular pago
router.put("/anular-pago/:PID", verifyToken, async (req, res) => {
  // Verificar que el usuario sea solo gerente
  if (req.user.role !== "gerente") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { PID } = req.params;
  const { user, ammount, contractaccount } = req.body;

  try {
    await db.tx(async (transaction) => {
      // Si no se ha proporcionado un PID
      if (!PID) {
        return res
          .status(400)
          .json({ message: "No PaymentTransactionID entered" });
      } else {
        //Si el PID no existe
        const query = await transaction.oneOrNone(
          `
      SELECT PaymentTransactionID
      FROM Payment
      WHERE PaymentTransactionID = $1;
    `,
          [PID]
        );

        if (!query) {
          return res
            .status(400)
            .json({ message: "Invalid PaymentTransactionID" });
        }
      }

      // Si la cuenta contrato no se ha proporcionado
      if (!contractaccount) {
        return res
          .status(400)
          .json({ message: "No contract account or CUEN entered" });
      } else {
        // Si la cuenta contrato o CUEN no es un número de 10 o 12 dígitos
        if (
          isNaN(contractaccount) ||
          (contractaccount.length !== 10 && contractaccount.length !== 12)
        ) {
          return res
            .status(400)
            .json({ message: "Invalid contract account or CUEN" });
        }
      }

      // Si no se ha proporcionado un usuario
      if (!user) {
        return res.status(400).json({ message: "No user entered" });
      } else {
        // Si el usuario no tiene un idcashpoint  idglobaluser
        if (!user.idglobaluser || !user.idcashpoint) {
          return res.status(400).json({ message: "Invalid user" });
        }
      }

      // Si no se ha proporcionado un monto
      if (!ammount) {
        return res.status(400).json({ message: "No amount entered" });
      } else {
        if (isNaN(ammount)) {
          return res.status(400).json({ message: "Invalid amount" });
        }
      }

      //Si el monto no es igual al del pago
      const query = await transaction.oneOrNone(
        `
    SELECT PaymentAmountCurrencyCode
    FROM Payment
    WHERE PaymentTransactionID = $1;
  `,
        [PID]
      );

      if (
        parseFloat(query.paymentamountcurrencycode).toFixed(2) !=
        parseFloat(ammount).toFixed(2)
      ) {
        return res
          .status(400)
          .json({ message: "Invalid amount, is diferent from the payment" });
      }

      // Si se trata de anular un pago que se encuentra en una caja ya cerrada

      // Obtengo el cashclosing del PID
      const cashClosing = await transaction.oneOrNone(
        `SELECT * FROM Payment WHERE PaymentTransactionID = $1;`,
        [PID]
      );

      const cashClosingExists = await transaction.oneOrNone(
        `SELECT CashPointPaymentGroupReferenceID FROM CashClosing WHERE CashPointPaymentGroupReferenceID = $1;`,
        [cashClosing.cashpointpaymentgroupreferenceid]
      );

      if (cashClosingExists) {
        return res.status(400).json({
          error:
            "No se puede anular el pago porque ya se cerró la caja del día ",
        });
      }

      //Quito de la tabla de pagos
      await transaction.none(
        `
      DELETE FROM Payment
      WHERE PaymentTransactionID = $1;
    `,
        [PID]
      );

      // Si se eliminaron todos los pagos, se tiene que eliminar de la tabla paymentgroup
      const query2 = await transaction.any(
        `
      SELECT CashPointPaymentGroupReferenceID
      FROM Payment
      WHERE CashPointPaymentGroupReferenceID = $1;
    `,

        [cashClosing.cashpointpaymentgroupreferenceid]
      );

      if (!query2) {
        await transaction.none(
          `
        DELETE FROM PaymentGroup
        WHERE CashPointPaymentGroupReferenceID = $1;
      `,
          [cashClosing.cashpointpaymentgroupreferenceid]
        );
      }

      //Agrego a la tabla de anulaciones, incluyendo la fecha y hora actual
      await transaction.none(
        `
      INSERT INTO ReversePayment (
        PaymentTransactionID, idGlobalUser, fecha_hora, idCashPoint, paymentAmountCurrencyCode, PayerContractAccountID
      )
      VALUES ($1, $2, NOW(), $3, $4, $5);
    `,
        [PID, user.idglobaluser, user.idcashpoint, ammount, contractaccount]
      );

      //Actualizo la deuda del cliente
      await transaction.none(
        `
      UPDATE Client
      SET debt = debt + $1
      WHERE PayerContractAccountID = $2;
    `,
        [ammount, contractaccount]
      );
      res.status(200).json({ message: "Payment reversed successfully." });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Ruta protegida: Obtener lista de pagos
router.get("/pagos/:idcashPoint", verifyToken, async (req, res) => {
  // Si el usuario no es cajero o gerente no puede ver los pagos
  if (req.user.role !== "cajero" && req.user.role !== "gerente") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const idcashPoint = req.params.idcashPoint;

  // Si no se ha proporcionado un idcashPoint
  if (!idcashPoint) {
    return res.status(400).json({ message: "No idcashPoint entered" });
  } else {
    // Si el idCashPoint no es el mismo que el del usuario
    if (idcashPoint !== req.user.idcashpoint) {
      return res.status(400).json({ message: "Invalid idcashPoint" });
    }
  }

  try {
    let payments = [];
    // Si el usuario es cajero, solo puede ver los pagos de su caja
    if (req.user.role === "cajero") {
      payments = await db.any(
        `
      SELECT
        Payment.*,
        VirtualCashPoint.idVirtualCashPoint,
        VirtualCashPoint.name AS virtualCashPointName,
        "User".username
      FROM Payment
      INNER JOIN VirtualCashPoint ON Payment.idGlobalVirtualCashPoint = VirtualCashPoint.idGlobalVirtualCashPoint
      INNER JOIN "User" ON Payment.idGlobalUser = "User".idGlobalUser
      WHERE Payment.idCashPoint=$1 AND Payment.idglobalvirtualcashpoint=$2 ORDER BY Payment.valueDate DESC;
    `,
        [idcashPoint, req.user.idglobalvirtualcashpoint]
      );
    } else if (req.user.role === "gerente") {
      payments = await db.any(
        `
      SELECT
        Payment.*,
        VirtualCashPoint.idVirtualCashPoint,
        VirtualCashPoint.name AS virtualCashPointName,
        "User".username
      FROM Payment
      INNER JOIN VirtualCashPoint ON Payment.idGlobalVirtualCashPoint = VirtualCashPoint.idGlobalVirtualCashPoint
      INNER JOIN "User" ON Payment.idGlobalUser = "User".idGlobalUser
      WHERE Payment.idCashPoint=$1 ORDER BY Payment.valueDate DESC;
    `,
        [idcashPoint]
      );
    }

    // Obtener los grupos de pago de la caja
    const paymentgroup = await db.any(
      `SELECT CashPointPaymentGroupReferenceID FROM PaymentGroup WHERE idCashPoint=$1 ORDER BY CashPointPaymentGroupReferenceID DESC;`,
      [idcashPoint]
    );

    // Filtrar los pagos que pertenecen a los grupos de pago de la caja
    const payments2 = payments
      .filter((payment) =>
        paymentgroup.some(
          (group) =>
            payment.cashpointpaymentgroupreferenceid ===
            group.cashpointpaymentgroupreferenceid
        )
      )
      .map((payment) => ({
        ...payment,
        paymentamountcurrencycode: parseFloat(
          payment.paymentamountcurrencycode
        ).toFixed(2),
      }));

    // Agrego informacion del cliente por cada pago
    for (let i = 0; i < payments2.length; i++) {
      const client = await db.oneOrNone(
        `SELECT * FROM Client WHERE PayerContractAccountID = $1;`,

        [payments2[i].payercontractaccountid]
      );

      payments2[i].cliente = client;
    }

    res.json(payments2);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Ruta protegida: Obtener lista de pagos anulados
router.get("/pagosAnulados/:idcashPoint", verifyToken, async (req, res) => {
  // Si el usuario no es cajero o gerente no puede ver los pagos
  if (req.user.role !== "cajero" && req.user.role !== "gerente") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const idcashPoint = req.params.idcashPoint;

  // Si no se ha proporcionado un idcashPoint
  if (!idcashPoint) {
    return res.status(400).json({ message: "No idcashPoint entered" });
  } else {
    // Si el idCashPoint no es el mismo que el del usuario
    if (idcashPoint !== req.user.idcashpoint) {
      return res.status(400).json({ message: "Invalid idcashPoint" });
    }
  }

  try {
    let reversePayments = [];
    // Si el usuario es cajero, solo puede ver los pagos anulados de su caja
    if (req.user.role === "cajero") {
      reversePayments = await db.any(
        `
        SELECT
        ReversePayment.*,
           "User".username
         FROM ReversePayment
             INNER JOIN "User" ON ReversePayment.idGlobalUser = "User".idGlobalUser
       WHERE ReversePayment.idCashPoint = $1 AND SUBSTRING(ReversePayment.PaymentTransactionID, 24, 2) = $2 ORDER BY ReversePayment.fecha_hora DESC;
    `,
        [
          idcashPoint,
          req.user.idvirtualcashpoint.toString().slice(-2).padStart(2, "0"),
        ]
      );
    } else if (req.user.role === "gerente") {
      reversePayments = await db.any(
        `
      SELECT
        ReversePayment.*,
        "User".username
      FROM ReversePayment
      INNER JOIN "User" ON ReversePayment.idGlobalUser = "User".idGlobalUser
      WHERE ReversePayment.idCashPoint=$1 ORDER BY ReversePayment.fecha_hora DESC;
    `,
        [idcashPoint]
      );
    }

    res.status(200).json(reversePayments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// Ruta protegida: Exportar los pagos y envia como respuesta un archivo csv
router.get("/exportar-pagos/:idcashPoint", verifyToken, async (req, res) => {
  // Si el usuario no es gerente no puede exportar los pagos
  if (req.user.role !== "gerente") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const idcashPoint = req.params.idcashPoint;

  // Si no se ha proporcionado un idcashPoint
  if (!idcashPoint) {
    return res.status(400).json({ message: "No idcashPoint entered" });
  } else {
    // Si el idCashPoint no es el mismo que el del usuario
    if (idcashPoint !== req.user.idcashpoint) {
      return res.status(400).json({ message: "Invalid idcashPoint" });
    }
  }

  try {
    // Obtener los pagos de la caja y de los grupos cerrados
    const payments = await db.any(
      `
      SELECT
        Payment.*,
        VirtualCashPoint.idVirtualCashPoint,
        VirtualCashPoint.name AS virtualCashPointName,
        "User".username
      FROM Payment
      INNER JOIN VirtualCashPoint ON Payment.idGlobalVirtualCashPoint = VirtualCashPoint.idGlobalVirtualCashPoint
      INNER JOIN "User" ON Payment.idGlobalUser = "User".idGlobalUser
      WHERE Payment.idCashPoint=$1 ORDER BY Payment.valueDate DESC;
    `,
      [idcashPoint]
    );

    // Agrego el la deuda actual del cliente y la direccion
    for (let i = 0; i < payments.length; i++) {
      const client = await db.oneOrNone(
        `
      SELECT debt, address, parroquia, isdisconnected
      FROM Client
      WHERE PayerContractAccountID = $1;
    `,
        [payments[i].payercontractaccountid]
      );

      payments[i].debt = client.debt;
      payments[i].address = client.address;
      payments[i].parroquia = client.parroquia;
      payments[i].isdisconnected = client.isdisconnected;
    }

    // Crear un archivo CSV en memoria
    const csvData = [
      // Titulos
      [
        "Cuenta_Contrato",
        "Saldo_Actual",
        "Direccion",
        "Parroquia",
        "Esta_Desconectado",
        "ID_Pago",
        "Fecha_Hora",
        "Monto",
        "ID_Cajero",
        "Cajero",
        "ID_Caja",
        "ID_Grupo",
        "ID_CajaVirtual",
        "Nombre_CajaVirtual",
      ],
      // Datos
      ...payments.map((payment) => [
        payment.payercontractaccountid,
        payment.debt,
        payment.address,
        payment.parroquia,
        payment.isdisconnected,
        payment.paymenttransactionid,
        payment.valuedate.toISOString(),
        payment.paymentamountcurrencycode,
        payment.idglobaluser,
        payment.username,
        payment.idcashpoint,
        payment.cashpointpaymentgroupreferenceid,
        payment.idvirtualcashpoint,
        payment.virtualcashpointname,
      ]),
    ];

    // Convertir los datos CSV en una cadena CSV
    const csvString = csvData.map((row) => row.join(";")).join("\n");

    const fileName = `Pagos-${new Date()
      .toLocaleString()
      .replace(/[\/:]/g, "-")
      .replace(/,/g, "")
      .replace(/ /g, "-")}.csv`;

    // Escribir la cadena CSV en un archivo temporal
    fs.writeFileSync(fileName, csvString);

    // Configurar las cabeceras de la respuesta para indicar que se enviará un archivo CSV
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "text/csv");

    // Agregar una entrada en la tabla de bitácora ("log")
    await db.none(
      `INSERT INTO log (username, action, description, timestamp)
      VALUES ($1, $2, $3, $4)`,
      [
        req.user.username,
        "Exportar Pagos",
        `El usuario ${req.user.username}, ha exportado los pagos de la caja ${idcashPoint}.`,
        new Date(),
      ]
    );

    // Enviar el archivo CSV como respuesta
    fs.createReadStream(fileName).pipe(res);

    // Escuchar el evento 'finish' en la respuesta
    res.on("finish", () => {
      // Eliminar el archivo después de que se ha enviado
      fs.unlink(fileName, (err) => {
        if (err) {
          console.error("Error al eliminar el archivo:", err);
        }
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
