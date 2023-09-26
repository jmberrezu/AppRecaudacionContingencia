const express = require("express");
const router = express.Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const verifyToken = require("../services/verifyToken");
const { checkPassword } = require("../services/hashpassword");
const axios = require("axios");
const https = require("https");
const xml2js = require("xml2js");
const { addActiveToken } = require("../services/verifyToken");
const { deleteActiveToken } = require("../services/verifyToken");

// Ruta para iniciar sesión
router.post("/", async (req, res) => {
  const { username, password } = req.body;

  // Si no se ha proporcionado usuario o contraseña
  if (!username || !password) {
    return res.status(400).json({ message: "User and Password Required" });
  }

  // Busca usuario en la base de datos
  const user = await db.oneOrNone(
    'SELECT * FROM Supervisor WHERE "user" = $1',
    [username]
  );

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
        role: "supervisor",
        idcashpoint: user.idcashpoint,
        username: user.user,
        office: user.office,
      },
      "admin_CTIC_2023!",
      { expiresIn: "3h" } // El token expira en 3 horas
    );

    // Agregar el token al conjunto de tokens activos
    addActiveToken(user.idcashpoint, token);

    res.json({ token });
  }
});

// Verificar si el token es válido y devuelve el rol del usuario, el username, la caja y la oficina
router.get("/verify", verifyToken, (req, res) => {
  res.json({
    role: req.user.role,
    idcashpoint: req.user.idcashpoint,
    username: req.user.username,
    office: req.user.office,
  });
});

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
        WHERE CashClosing.idCashPoint = $1`,
      [idcashpoint]
    );

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving data" });
  }
});

// Función para enviar pagos
async function sendPayment(payment, username, password, office) {
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

      // Aquí puedes manejar el error SOAP:Fault como lo desees
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

    // Si no hay errores, devuelve los datos de respuesta exitosa
    return responseData;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      // El código de estado 401 indica que las credenciales son incorrectas
      throw new Error("Credenciales incorrectas");
    } else {
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
      `SELECT * FROM Payment WHERE idCashPoint = $1 AND CashPointPaymentGroupReferenceID = $2`,
      [idcashpoint, cash.cashpointpaymentgroupreferenceid]
    );

    // Envio el pago, agrego el registro Payment a la tabla PaymentSent y elimino el registro de la tabla Payment
    for (const payment of payments) {
      try {
        await sendPayment(payment, username, password, office);

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
        // Si el error es 401, las credenciales son incorrectas
        if (error.message === "Credenciales incorrectas") {
          return res.status(401).json({ message: "Credenciales incorrectas" });
        } else {
          console.error(error);
          return res.status(500).json({ message: error.message }); // Enviar el mensaje de error al front // Detener la ejecución
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

  // El XML que deseas enviar en la solicitud SOAP
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
      return res.json({ printermessage: "" });
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

  // Si el mensaje no se ha ingresado
  if (!message) {
    return res.status(400).json({ message: "message is required" });
  }

  // Si el mensaje es de 0 o mayor a 100 caracteres
  if (message.length === 0 || message.length > 100) {
    return res
      .status(400)
      .json({ message: "Message must be between 1 and 100 characters" });
  }

  try {
    await db.none(
      `UPDATE supervisor SET printermessage = $1 WHERE idCashPoint = $2`,
      [message, idcashpoint]
    );

    res.json({ message: "Printer message updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving data" });
  }
});

// Cerrar sesion
router.delete("/logout", verifyToken, async (req, res) => {
  // Eliminar el token del conjunto de tokens activos
  deleteActiveToken(req.user.idcashpoint);
  res.json({ message: "Logout successful" });
});

module.exports = router;
