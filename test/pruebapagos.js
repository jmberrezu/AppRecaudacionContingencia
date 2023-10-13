const axios = require("axios");

const baseUrl = "http://localhost:5000";
const numInsertions = 1;

const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWRnbG9iYWx1c2VyIjozOCwidXNlcm5hbWUiOiJsdWlzIiwicm9sZSI6ImdlcmVudGUiLCJpZGdsb2JhbHZpcnR1YWxjYXNocG9pbnQiOjg1LCJpZGNhc2hwb2ludCI6IkNBRVgtQ09OLUMyLTEwMDIiLCJzb2NpZXR5ZGl2aXNpb24iOiIxMDAyIiwiaWR2aXJ0dWFsY2FzaHBvaW50IjoxLCJ2aXJ0dWFsY2FzaHBvaW50bmFtZSI6IkNhamEgMSIsImlhdCI6MTY5NzIwNTgyNSwiZXhwIjoxNjk3MjE2NjI1fQ.ZIrWfxPPjNGmZNIeTjrRprAOv2AT2SGKzVRQPR8Ar04";

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
