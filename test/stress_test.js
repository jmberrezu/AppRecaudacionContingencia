import http from "k6/http";
import { sleep } from "k6";

const users = 1500;

export const options = {
  insecureSkipTLSVerify: true,
  noConnectionReuse: false,
  //   Stress Test
  stages: [
    { duration: "30s", target: users },
    { duration: "1.5m", target: users },
    { duration: "30s", target: 0 },
  ],
  //   Spike Test
  //   stages: [
  //     { duration: "30s", target: 1000 },
  //     { duration: "15s", target: 3000 },
  //     { duration: "15s", target: 2000 },
  //     { duration: "1m", target: 0 },
  //   ],
  //   Soak Test
  //   stages: [
  //     { duration: "1m", target: users },
  //     { duration: "10m", target: users },
  //     { duration: "1m", target: 0 },
  //   ],
};

const baseURL = "http://172.19.136.208:5000/api/paymentRoutes";
const token =
  "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWRnbG9iYWx1c2VyIjoyOCwidXNlcm5hbWUiOiJwcnUiLCJyb2xlIjoiZ2VyZW50ZSIsImlkZ2xvYmFsdmlydHVhbGNhc2hwb2ludCI6NzYsImlkY2FzaHBvaW50IjoiQ0FFWC1DMEMtUDItMTAxMDoxMDA3IiwiaWR2aXJ0dWFsY2FzaHBvaW50IjoyLCJ2aXJ0dWFsY2FzaHBvaW50bmFtZSI6IkFDYWphIiwiaWF0IjoxNjk0NTMwNzUzLCJleHAiOjE2OTQ1NDE1NTN9.AVPf29bl6Qxuze61FR4-EL1Eg6Dg62TrJyX3yDSrwGw";
const headers = {
  "Content-Type": "application/json",
  Authorization: token,
};

export default () => {
  // Ruta normal de un usuario

  // Solicitud al frontend
  const baseURLF = "http://172.19.136.208:3000";

  const requests = [
    { url: `${baseURLF}/`, name: "Homepage" },
    {
      url: `${baseURLF}/static/media/logoCh.ed0516de672f59aec0f2401a09de808c.svg`,
      name: "Favicon",
    },
    { url: `${baseURLF}/logo192.png`, name: "Logo" },
    // Manifest file
    { url: `${baseURLF}/manifest.json`, name: "Manifest" },
    // Bundle files
    { url: `${baseURLF}/static/js/bundle.js`, name: "Bundle" },
    // Ws
    { url: `${baseURLF}/ws`, name: "Ws" },
  ];

  http.batch(requests);
  sleep(1);

  // Realizar 2 solicitudes GET para buscar un cliente por cuenta o contrato
  const buscarClienteURL = `${baseURL}/buscar-cliente/200025410974`;
  http.get(buscarClienteURL, { headers });
  sleep(1);
  http.get(buscarClienteURL, { headers });
  sleep(1);

  // Solicitud al frontend

  http.batch(requests);
  sleep(1);

  // Realizar una solicitud POST para realizar un pago
  const realizarPagoURL = `${baseURL}/realizar-pago`;
  const requestBodyRealizarPago = {
    cantidadTotal: 0.01, // Monto total del pago
    cuentaContrato: "200025410974", // Número de cuenta o CUEN
    user: {
      id: 1, // ID de usuario
      idcashpoint: "CAEX-C0C-P2-1010:1007", // ID de cajero
      idvirtualcashpoint: "2", // ID de caja virtual
      idglobaluser: 28, // ID global de usuario
      idglobalvirtualcashpoint: 76, // ID global de caja virtual
    },
  };

  http.post(realizarPagoURL, JSON.stringify(requestBodyRealizarPago), {
    headers,
  });
  sleep(1);

  // Solicitud al frontend

  http.batch(requests);
  sleep(1);

  // Realizar una solicitud GET para obtener la lista de pagos
  const obtenerListaPagosURL = `${baseURL}/pagos/CAEX-C0C-P2-1010:1007`;
  http.get(obtenerListaPagosURL, { headers });
  sleep(1);

  // Solicitud al frontend

  http.batch(requests);
  sleep(1);

  // Realizar una solicitud GET para obtener la lista de pagos anulados
  const obtenerListaPagosAnuladosURL = `${baseURL}/pagosAnulados/CAEX-C0C-P2-1010:1007`;
  http.get(obtenerListaPagosAnuladosURL, { headers });
  sleep(1);
};
