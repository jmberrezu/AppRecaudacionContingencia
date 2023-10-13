const axios = require("axios");

const baseUrl = "http://localhost:5000";
const numInsertions = 1000;

const token = "";

// Datos del pago (ajusta según tus necesidades)
const paymentData = {
  cantidadTotal: 0.01,
  cuentaContrato: "200001206693",
  user: {
    id: 1,
    idcashpoint: "CAEX-CON-C2-1002",
    idvirtualcashpoint: 1,
    idglobaluser: 38,
    idglobalvirtualcashpoint: 85,
  },
};

async function realizarPago() {
  try {
    const responses = [];

    for (let i = 0; i < numInsertions; i++) {
      const response = await axios.post(
        `${baseUrl}/api/paymentRoutes/realizar-pago`,
        paymentData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      responses.push(response.data);
    }

    console.log(`Se han realizado ${numInsertions} pagos con éxito.`);
    console.log(responses);
  } catch (error) {
    console.error("Error al realizar los pagos:", error);
  }
}

realizarPago();
