import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "react-bootstrap";
import sparkPayLogo from "../../images/logoM.svg";

function GenerateComprobant({
  user,
  paymentData,
  direccion,
  cuentaContrato,
  cliente,
  esReimpresion,
  onCloseModal,
  message,
}) {
  const conponentPDF = useRef();

  const generatePDF = useReactToPrint({
    content: () => conponentPDF.current,
    documentTitle: "Comprobante_Pago_" + paymentData.pid,
  });

  return (
    <React.Fragment>
      {cliente && (
        <div>
          <div style={{ display: "none" }}>
            <div
              ref={conponentPDF}
              style={{
                width: "30%",
                fontSize: "12px",
              }}
            >
              <div className="ps-2">
                <p
                  className="m-0 p-0"
                  style={{ textAlign: "center", fontWeight: "bold" }}
                >
                  COMPROBANTE DE PAGO
                </p>
                <div className="m-0 p-0" style={{ textAlign: "center" }}>
                  {esReimpresion && (
                    <span
                      style={{
                        fontWeight: "bold",
                        fontStyle: "italic",
                      }}
                    >
                      {" "}
                      --------- REIMPRESIÓN ---------
                    </span>
                  )}
                </div>

                <p className="m-0 p-0">
                  <span style={{ fontWeight: "bold" }}>Id de Pago: </span>
                  {paymentData.pid}
                </p>
                <p
                  style={{ textAlign: "center", fontWeight: "bold" }}
                  className="my-1 mx-0 border-top border-bottom border-black"
                >
                  DATOS DEL CAJERO
                </p>
                <p className="m-0 p-0">
                  {" "}
                  <span style={{ fontWeight: "bold" }}>Oficina: </span>
                  {user.idcashpoint}
                </p>
                <p className="m-0 p-0">
                  <span style={{ fontWeight: "bold" }}>Caja: </span>
                  {user.virtualcashpointname}
                  <span style={{ fontWeight: "bold" }}> | ID Caja: </span>{" "}
                  {user.idvirtualcashpoint}
                </p>
                <p className="m-0 p-0">
                  <span style={{ fontWeight: "bold" }}>Cajero: </span>
                  {user.username}
                </p>
                <p className="m-0 p-0">
                  <span style={{ fontWeight: "bold" }}> ID Cajero: </span>
                  {user.id}
                </p>
                <p className="m-0 p-0">
                  <span style={{ fontWeight: "bold" }}>Fecha Pago: </span>
                  {paymentData.date} | {paymentData.time}
                </p>
                <p
                  style={{ textAlign: "center", fontWeight: "bold" }}
                  className="my-1 mx-0  border-top border-bottom border-black"
                >
                  DATOS DEL CLIENTE
                </p>
                <p className="m-0 p-0">
                  <span style={{ fontWeight: "bold" }}>Cliente: </span>
                  {cliente.name}
                </p>
                <p className="m-0 p-0">
                  <span style={{ fontWeight: "bold" }}>Cuenta Contrato: </span>
                  {cuentaContrato}
                </p>
                <p className="m-0 p-0">
                  <span style={{ fontWeight: "bold" }}>Dirección: </span>
                  {direccion}
                </p>
                <p
                  style={{ textAlign: "center", fontWeight: "bold" }}
                  className="my-1 mx-0 p-0 border-top border-bottom border-black"
                >
                  DETALLES DE PAGO
                </p>
                <p className="m-0 p-0">
                  <strong style={{ fontWeight: "bold" }}>Monto: </strong>
                  {parseFloat(paymentData.amount).toFixed(2)}$ USD
                </p>
                <hr className="mt-2 mb-0 py-0 opacity-100" />
                <p className="mt-2 p-0" style={{ textAlign: "center" }}>
                  <strong style={{ fontWeight: "bold" }}>
                    {message ? message : ""}
                  </strong>
                </p>
                <p className=" p-0 border mt-0" style={{ textAlign: "center" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <img
                      style={{ height: "25px" }}
                      src={sparkPayLogo}
                      alt="SparkPay Logo"
                      className="img-fluid mt-1"
                    />
                  </div>
                  <strong style={{ fontWeight: "bold" }}>
                    * * * SPARK-PAY * * *
                  </strong>
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="outline-success"
            onClick={() => {
              generatePDF();
              onCloseModal();
            }}
          >
            Imprimir Comprobante
          </Button>
        </div>
      )}
    </React.Fragment>
  );
}
export default GenerateComprobant;
