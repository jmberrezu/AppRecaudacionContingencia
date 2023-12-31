const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../services/verifyToken");
const axios = require("axios");
const https = require("https");
const xml2js = require("xml2js");
const fs = require("fs");

// Obtengo las cajas cerradas
router.get("/closedcash/:idcashpoint", verifyToken, async (req, res) => {
  // Si el rol no es supervisor
  if (req.user.role !== "supervisor") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { idcashpoint } = req.params;

  // Si el idcashPoint no se ha ingresado
  if (!idcashpoint) {
    return res.status(400).json({ message: "idcashPoint is required" });
  }

  try {
    const results = await db.query(
      `SELECT CashClosing.*,
        VirtualCashPoint.idVirtualCashPoint,
            VirtualCashPoint.name AS virtualCashPointName
        FROM CashClosing
        INNER JOIN VirtualCashPoint ON CashClosing.idGlobalVirtualCashPoint = VirtualCashPoint.idGlobalVirtualCashPoint
        WHERE CashClosing.idCashPoint = $1 ORDER BY CashClosing.valueDate DESC`,
      [idcashpoint]
    );

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving data" });
  }
});

// Función para enviar pagos
async function sendPayment(payment, username, password, office, supervisor) {
  // Definir los valores para las variables en el XML
  const ID = "ID-Ejemplo-CONTINGENCIA";
  const CreationDateTime = new Date().toISOString();
  const CashPointReferenceID = payment.idcashpoint;
  const CashPointOfficeReferenceID = office;
  const CashPointPaymentGroupReferenceID =
    payment.cashpointpaymentgroupreferenceid;
  const PaymentTransactionID = payment.paymenttransactionid;
  const PaymentAmount = payment.paymentamountcurrencycode;
  const ValueDate = payment.valuedate.toISOString().split("T")[0];
  const ItemText = "CONTINGENCIA";
  const PayerContractAccountID = payment.payercontractaccountid;

  // Crear el XML para el pago utilizando plantillas de cadena de JavaScript
  const xmlData = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:glob="http://sap.com/xi/SAPGlobal/Global">
        <soapenv:Header/>
        <soapenv:Body>
            <glob:CashPointPaymentCreateNotificationMessage>
                <MessageHeader>
                    <ID>${ID}</ID>
                    <CreationDateTime>${CreationDateTime}</CreationDateTime>
                </MessageHeader>
                <CashPointPayment>
                    <CashPointReferenceID>${CashPointReferenceID}</CashPointReferenceID>
                    <CashPointOfficeReferenceID>${CashPointOfficeReferenceID}</CashPointOfficeReferenceID>
                    <CashPointPaymentGroupReferenceID>${CashPointPaymentGroupReferenceID}</CashPointPaymentGroupReferenceID>
                    <PaymentTransactionID>${PaymentTransactionID}</PaymentTransactionID>
                    <PaymentAmount currencyCode="USD">${PaymentAmount}</PaymentAmount>
                    <ValueDate>${ValueDate}</ValueDate>
                    <ItemText>${ItemText}</ItemText>
                    <PayerContractAccountID>${PayerContractAccountID}</PayerContractAccountID>
                </CashPointPayment>
            </glob:CashPointPaymentCreateNotificationMessage>
        </soapenv:Body>
    </soapenv:Envelope>
  `;

  const url =
    "https://dpower.redenergia.gob.ec:8443/cis/sap/xi/engine?type=entry&version=3.0&Sender.Service=BS_EXTCASH_QAS&Interface=urn:cisnergia.gob.ec:cashpoint:sapisu:CashPointPaymentCreateNotification^CashPointPaymentCreateNotification_Out";

  // Codifica el usuario y la contraseña en base64
  const base64Credentials = Buffer.from(`${username}:${password}`).toString(
    "base64"
  );

  // Configuración de Axios
  const axiosConfig = {
    headers: {
      "Content-Type": "text/xml;charset=UTF-8",
      Authorization: `Basic ${base64Credentials}`,
      SOAPAction: "http://sap.com/xi/WebService/soap1.1",
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  };

  try {
    const response = await axios.post(url, xmlData, axiosConfig);

    // Si no existe respuesta
    if (!response) {
      throw new Error("No response");
    }

    const responseData = response.data;

    // Parsear la respuesta SOAP
    const parsedResponse = await xml2js.parseStringPromise(responseData);

    // Verificar si hay un SOAP:Fault en la respuesta
    if (parsedResponse["SOAP:Envelope"]["SOAP:Body"][0]["SOAP:Fault"]) {
      const faultDetail =
        parsedResponse["SOAP:Envelope"]["SOAP:Body"][0]["SOAP:Fault"][0][
          "detail"
        ][0]["ns0:CashPointClosingDocumentFault"][0]["standard"][0][
          "faultDetail"
        ][0];

      const severity = faultDetail["severity"][0];
      const errorText = faultDetail["text"][0];
      const errorId = faultDetail["id"][0];

      // Aquí puedes manejar el error SOAP:
      throw new Error(
        `SOAP:Fault - Severity: ${severity}, Error Text: ${errorText}, Error ID: ${errorId}`
      );
    }

    // Acceder a los elementos en la respuesta SOAP
    const returnType =
      parsedResponse["SOAP:Envelope"]["SOAP:Body"][0][
        "ns0:MT_CreatePaymnet_In"
      ][0]["RETURN"][0]["TYPE"][0];
    const errorMessage =
      parsedResponse["SOAP:Envelope"]["SOAP:Body"][0][
        "ns0:MT_CreatePaymnet_In"
      ][0]["RETURN"][0]["MESSAGE"][0];

    if (returnType === "E") {
      // Si el tipo de mensaje es un error (E), maneja el error aquí
      throw new Error(errorMessage);
    }

    // Agregar una entrada en la tabla de bitácora ("log")
    await db.none(
      `INSERT INTO log (username, action, description, timestamp)
      VALUES ($1, $2, $3, $4)`,
      [
        supervisor,
        "Envío de pago",
        `El supervsor ${supervisor}, con username ${username}, ha enviado el pago con el id ${payment.paymenttransactionid} y el valor de ${payment.paymentamountcurrencycode}.`,
        new Date(),
      ]
    );

    // Si no hay errores, devuelve los datos de respuesta exitosa
    return responseData;
  } catch (error) {
    // Si el error contiene en error la cadena de texto "ya existe", significa que es duplicado
    if (error.message.includes("ya existe")) {
      //Envio un error con el codigo 409 y el mensaje de error.message, y el pago que se ha duplicado
      throw { status: 409, message: error.message, duplicatepayment: payment };
    }
    if (error.response && error.response.status === 401) {
      // El código de estado 401 indica que las credenciales son incorrectas
      throw new Error("Credenciales incorrectas");
    } else {
      // Si el error no es 401, envio el error y el pago que falló
      throw new Error(error);
    }
  }
}

// Send principal service
router.post("/sendprincipal", verifyToken, async (req, res) => {
  // Si el rol no es supervisor
  if (req.user.role !== "supervisor") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { idcashpoint, cash, username, office, password } = req.body;

  // Si el idcashPoint no se ha ingresado
  if (!idcashpoint) {
    return res.status(400).json({ message: "idcashPoint is required" });
  }

  // Si el idcashPoint no coincide con el idcashPoint del usuario
  if (idcashpoint !== req.user.idcashpoint) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Si el office no se ha ingresado
  if (!office) {
    return res.status(400).json({ message: "office is required" });
  }

  // Si el cash no se ha ingresado
  if (!cash) {
    return res.status(400).json({ message: "cash is required" });
  }

  // Si el cash no tiene closingdoccumentamount o realclosingdoccumentamount
  if (
    !cash.closingdoccumentamount ||
    !cash.realclosingdoccumentamount ||
    !cash.valuedate ||
    !cash.cashpointpaymentgroupreferenceid
  ) {
    return res.status(400).json({
      message:
        "closingdoccumentamount, realclosingdoccumentamount, valuedate and cashpointpaymentgroupreferenceid are required",
    });
  }

  // Si closingdoccumentamount no es igual a realclosingdoccumentamount, no deja enviar
  if (cash.closingdoccumentamount !== cash.realclosingdoccumentamount) {
    return res.status(400).json({
      message:
        "closingdoccumentamount is not equal to realclosingdoccumentamount",
    });
  }

  // Si el username o password no se ha ingresado
  if (!username || !password) {
    return res.status(400).json({ message: "username and password required" });
  }

  // Enviar cada uno de los pagos
  try {
    const payments = await db.query(
      `SELECT * FROM Payment WHERE idCashPoint = $1 AND CashPointPaymentGroupReferenceID = $2 ORDER BY valueDate DESC`,
      [idcashpoint, cash.cashpointpaymentgroupreferenceid]
    );

    // Envio el pago, agrego el registro Payment a la tabla PaymentSent y elimino el registro de la tabla Payment
    for (const payment of payments) {
      try {
        await sendPayment(
          payment,
          username,
          password,
          office,
          req.user.username
        );

        await db.tx(async (transaction) => {
          await transaction.none(
            `INSERT INTO PaymentSent (PaymentTransactionID, valueDate, paymentAmountCurrencyCode, PayerContractAccountID, CashPointPaymentGroupReferenceID, idCashPoint)
          SELECT PaymentTransactionID, valueDate, paymentAmountCurrencyCode, PayerContractAccountID, CashPointPaymentGroupReferenceID, idCashPoint
          FROM Payment WHERE paymenttransactionid = $1`,
            [payment.paymenttransactionid]
          );

          await transaction.none(
            `DELETE FROM Payment WHERE paymenttransactionid = $1`,
            [payment.paymenttransactionid]
          );

          // Tambien los reversepayments
          await transaction.none(
            `INSERT INTO ReversePaymentSent (PaymentTransactionID, idCashPoint, fecha_hora, paymentAmountCurrencyCode)
          SELECT PaymentTransactionID, idCashPoint, fecha_hora, paymentAmountCurrencyCode
          FROM ReversePayment WHERE paymenttransactionid = $1`,
            [payment.paymenttransactionid]
          );

          await transaction.none(
            `DELETE FROM ReversePayment WHERE paymenttransactionid = $1`,
            [payment.paymenttransactionid]
          );
        });
      } catch (error) {
        // Si el error es 409, el pago es duplicado
        if (error.status === 409) {
          // Obtengo los pagos que si se han enviado, los que no
          const paymentsSent = await db.query(
            `SELECT * FROM PaymentSent WHERE idCashPoint = $1 AND CashPointPaymentGroupReferenceID = $2 ORDER BY valueDate DESC`,
            [idcashpoint, cash.cashpointpaymentgroupreferenceid]
          );
          const paymentsNotSent = await db.query(
            `SELECT * FROM Payment WHERE idCashPoint = $1 AND CashPointPaymentGroupReferenceID = $2 ORDER BY valueDate DESC`,
            [idcashpoint, cash.cashpointpaymentgroupreferenceid]
          );

          return res.status(409).json({
            message: error.message,
            paymentssent: paymentsSent,
            paymentsnotsent: paymentsNotSent,
            duplicatepayment: error.duplicatepayment,
          });
        }
        // Si el error es 401, las credenciales son incorrectas
        if (error.message === "Credenciales incorrectas") {
          return res.status(401).json({ message: "Credenciales incorrectas" });
        } else {
          console.error(error);
          // Envio el error y el pago que falló
          return res.status(500).json({ message: error.message, payment });
        }
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error sending data" });
  }

  const ID = "ID-Ejemplo";
  const CreationDateTime = new Date().toISOString();
  const CashPointReferenceID = idcashpoint;
  const CashPointOfficeReferenceID = office;
  const CashPointPaymentGroupReferenceID =
    cash.cashpointpaymentgroupreferenceid;
  const ClosingDocumentAmount = cash.closingdoccumentamount;
  const ValueDate = cash.valuedate.split("T")[0];

  // El XML  en la solicitud SOAP
  const xmlData = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:glob="http://sap.com/xi/SAPGlobal/Global">
        <soapenv:Header/>
        <soapenv:Body>
            <glob:CashPointClosingDocumentNotificationMessage>
                <MessageHeader>
                    <ID>${ID}</ID>
                    <CreationDateTime>${CreationDateTime}</CreationDateTime>
                </MessageHeader>
                <CashPointClosingDocument>
                    <CashPointReferenceID>${CashPointReferenceID}</CashPointReferenceID>
                    <CashPointOfficeReferenceID>${CashPointOfficeReferenceID}</CashPointOfficeReferenceID>
                    <CashPointPaymentGroupReferenceID>${CashPointPaymentGroupReferenceID}</CashPointPaymentGroupReferenceID>
                    <ClosingDocumentAmount currencyCode="USD">${ClosingDocumentAmount}</ClosingDocumentAmount>
                    <ValueDate>${ValueDate}</ValueDate>
                </CashPointClosingDocument>
            </glob:CashPointClosingDocumentNotificationMessage>
        </soapenv:Body>
    </soapenv:Envelope>
  `;

  const url =
    "https://dpower.redenergia.gob.ec:8443/cis/sap/xi/engine?type=entry&version=3.0&Sender.Service=BS_EXTCASH_QAS&Interface=urn:cisnergia.gob.ec:cashpoint:sapisu:CashPointClsoingDocumentNotification^CashPointClosingDocumentNotification_Out";

  // Codifica el usuario y la contraseña en base64
  const base64Credentials = Buffer.from(`${username}:${password}`).toString(
    "base64"
  );

  // Configuración de Axios
  const axiosConfig = {
    headers: {
      "Content-Type": "text/xml;charset=UTF-8",
      Authorization: `Basic ${base64Credentials}`,
      SOAPAction: "http://sap.com/xi/WebService/soap1.1",
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  };

  try {
    const response = await axios.post(url, xmlData, axiosConfig);

    // Si no existe respuesta
    if (!response) {
      throw new Error("No response");
    }

    const responseData = response.data;

    // Parsear la respuesta SOAP
    const parsedResponse = await xml2js.parseStringPromise(responseData);

    // Verificar si hay un SOAP:Fault en la respuesta
    if (parsedResponse["SOAP:Envelope"]["SOAP:Body"][0]["SOAP:Fault"]) {
      const faultDetail =
        parsedResponse["SOAP:Envelope"]["SOAP:Body"][0]["SOAP:Fault"][0][
          "detail"
        ][0]["ns0:CashPointClosingDocumentFault"][0]["standard"][0][
          "faultDetail"
        ][0];

      const severity = faultDetail["severity"][0];
      const errorText = faultDetail["text"][0];
      const errorId = faultDetail["id"][0];

      throw new Error(
        `Severity: ${severity}, Error Text: ${errorText}, Error ID: ${errorId}`
      );
    }

    // Si no hay SOAP:Fault en la respuesta, continúa con el flujo normal

    await db.tx(async (transaction) => {
      // Agrego el registro CashClosing a la tabla CashClosingSent  y elimino el registro de la tabla CashClosing
      await transaction.none(
        `INSERT INTO CashClosingSent (idCashPoint, closingdoccumentamount, valueDate, CashPointPaymentGroupReferenceID)
        SELECT idCashPoint, closingdoccumentamount, valueDate, CashPointPaymentGroupReferenceID
        FROM CashClosing WHERE cashpointpaymentgroupreferenceid = $1`,
        [cash.cashpointpaymentgroupreferenceid]
      );

      await transaction.none(
        `DELETE FROM CashClosing WHERE cashpointpaymentgroupreferenceid = $1`,
        [cash.cashpointpaymentgroupreferenceid]
      );
    });

    // Agregar una entrada en la tabla de bitácora ("log")
    await db.none(
      `INSERT INTO log (username, action, description, timestamp)
      VALUES ($1, $2, $3, $4)`,
      [
        req.user.username,
        "Envío de cierre",
        `El supervsor ${req.user.username}, con username ${username}, ha enviado el cierre con el id ${cash.cashpointpaymentgroupreferenceid} y el valor de ${cash.closingdoccumentamount}.`,
        new Date(),
      ]
    );

    res.json({ message: "Cash closing sent" });
  } catch (error) {
    if (error.response && error.response.status === 401) {
      // El código de estado 401 indica que las credenciales son incorrectas
      return res.status(401).json({ message: "Credenciales incorrectas" });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
});

// Anular un pago si es duplicado
router.delete("/reversepayment/:idcashpoint", verifyToken, async (req, res) => {
  // Si el rol no es supervisor
  if (req.user.role !== "supervisor") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { idcashpoint } = req.params;

  // Si el idcashPoint no se ha ingresado
  if (!idcashpoint) {
    return res.status(400).json({ message: "idcashPoint is required" });
  }

  // Si el idcashPoint no coincide con el idcashPoint del usuario
  if (idcashpoint !== req.user.idcashpoint) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const paymenttransactionid = req.body.paymenttransactionid;

  // Si el paymenttransactionid no se ha ingresado
  if (!paymenttransactionid) {
    return res
      .status(400)
      .json({ message: "paymenttransactionid is required" });
  }

  try {
    // Anulo el pago
    await db.tx(async (transaction) => {
      // Insertar en la tabla de paymentsent
      await transaction.none(
        `INSERT INTO PaymentSent (PaymentTransactionID, valueDate, paymentAmountCurrencyCode, PayerContractAccountID, CashPointPaymentGroupReferenceID, idCashPoint)
          SELECT PaymentTransactionID, valueDate, paymentAmountCurrencyCode, PayerContractAccountID, CashPointPaymentGroupReferenceID, idCashPoint
          FROM Payment WHERE paymenttransactionid = $1`,
        [paymenttransactionid]
      );

      await transaction.none(
        `DELETE FROM Payment WHERE paymenttransactionid = $1`,
        [paymenttransactionid]
      );
    });

    // Agregar una entrada en la tabla de bitácora ("log")
    await db.none(
      `INSERT INTO log (username, action, description, timestamp)
      VALUES ($1, $2, $3, $4)`,
      [
        req.user.username,
        "Pasar pago",
        `El supervsor ${req.user.username}, ha pasado el pago con el id ${paymenttransactionid}.`,
        new Date(),
      ]
    );

    res.json({ message: "Payment reversed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error reversing payment" });
  }
});

// Obtengo las cajas enviadas con pagos
router.get(
  "/cashclosehistorywithpayments/:idcashpoint",
  verifyToken,
  async (req, res) => {
    // Si el rol no es supervisor
    if (req.user.role !== "supervisor") {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { idcashpoint } = req.params;

    // Si el idcashPoint no se ha ingresado
    if (!idcashpoint) {
      return res.status(400).json({ message: "idcashPoint is required" });
    }

    try {
      const results = await db.query(
        `SELECT * FROM CashClosingSent WHERE idCashPoint = $1`,
        [idcashpoint]
      );

      // Obtengo los pagos
      for (let i = 0; i < results.length; i++) {
        const pagos = await db.query(
          `SELECT * FROM PaymentSent WHERE idCashPoint = $1 AND CashPointPaymentGroupReferenceID = $2`,
          [idcashpoint, results[i].cashpointpaymentgroupreferenceid]
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

// Ruta para obtener el mensaje
router.get("/printmessage/:idcashpoint", verifyToken, async (req, res) => {
  // Si el rol no es supervisor o gerente o cajero
  if (
    req.user.role !== "supervisor" &&
    req.user.role !== "gerente" &&
    req.user.role !== "cajero"
  ) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { idcashpoint } = req.params;

  // Si el idcashPoint no se ha ingresado
  if (!idcashpoint) {
    return res.status(400).json({ message: "idcashPoint is required" });
  }

  try {
    const results = await db.one(
      `SELECT printermessage FROM supervisor WHERE idCashPoint = $1`,
      [idcashpoint]
    );

    // Si el mensaje esta vacio o es null retorno una cadena en blanco
    if (!results.printermessage) {
      return res.json("");
    }

    res.json(results.printermessage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving data" });
  }
});

// Ruta para guardar el mensaje
router.post("/printmessage/:idcashpoint", verifyToken, async (req, res) => {
  // Si el rol no es supervisor
  if (req.user.role !== "supervisor") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { idcashpoint } = req.params;
  const { message } = req.body;

  // Si el idcashPoint no se ha ingresado
  if (!idcashpoint) {
    return res.status(400).json({ message: "idcashPoint is required" });
  }

  // Si el mensaje es mayor a 100 caracteres
  if (message.length > 100) {
    return res
      .status(400)
      .json({ message: "Message must be less than 100 characters" });
  }

  try {
    // Si el mensaje es vacio, lo guardo como null

    if (message === "") {
      await db.none(
        `UPDATE supervisor SET printermessage = null WHERE idCashPoint = $1`,
        [idcashpoint]
      );
    } else {
      await db.none(
        `UPDATE supervisor SET printermessage = $1 WHERE idCashPoint = $2`,
        [message, idcashpoint]
      );
    }

    res.json({ message: "Printer message updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving data" });
  }
});

// Exportar la lista de clientes en csv
router.get("/exportclients/:societydivision", verifyToken, async (req, res) => {
  // Si el rol no es supervisor
  if (req.user.role !== "supervisor") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { societydivision } = req.params;

  // Si no se ha recibido el societydivision
  if (!societydivision) {
    return res.status(400).json({ message: "societydivision is required" });
  }

  try {
    const results = await db.query(
      `SELECT * FROM Client WHERE societydivision = $1`,
      [societydivision]
    );

    const csvData = [
      // Titulos
      [
        "PayerContractAccountID",
        "CUEN",
        "Name",
        "Address",
        "Debt",
        "Parroquia",
        "IsDisconnected",
      ],
      // Datos
      ...results.map((client) => [
        client.payercontractaccountid,
        client.cuen,
        client.name,
        client.address,
        client.debt,
        client.parroquia,
        client.isdisconnected,
      ]),
    ];

    // Convertir los datos CSV en una cadena CSV
    const csvString = csvData.map((row) => row.join(";")).join("\n");

    const fileName = `Clientes-${new Date()
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
        "Exportar Clientes",
        `El supervsor ${req.user.username}, ha exportado la lista de clientes.`,
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
    res.status(500).json({ error: "Error retrieving data" });
  }
});

module.exports = router;
