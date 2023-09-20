import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "react-bootstrap";

function GenerateComprobant({
  user,
  paymentData,
  direccion,
  cuentaContrato,
  cliente,
  esReimpresion,
  onCloseModal,
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
                width: "25%",
                fontSize: "12px",
              }}
            >
              <div className="ps-1">
                <p
                  className="m-0 p-0"
                  style={{ textAlign: "center", fontWeight: "bold" }}
                >
                  COMPROBANTE DE PAGO
                </p>
                {/* Si es reimpresion se muestra un mensaje */}
                {esReimpresion && (
                  <p className="m-0 p-0" style={{ textAlign: "center" }}>
                    <span
                      style={{
                        fontWeight: "bold",
                        fontStyle: "italic",
                      }}
                    >
                      {" "}
                      ------ Copia ------
                    </span>
                  </p>
                )}
                {/* Si es original se muestra */}
                {!esReimpresion && (
                  <p className="m-0 p-0" style={{ textAlign: "center" }}>
                    <span
                      style={{
                        fontWeight: "bold",
                        fontStyle: "italic",
                      }}
                    >
                      {" "}
                      ------ Original ------
                    </span>
                  </p>
                )}
                <p className="m-0 p-0">=======================</p>
                <p
                  style={{ textAlign: "center", fontWeight: "bold" }}
                  className="m-0 p-0"
                >
                  ==== DATOS DEL CAJERO ====
                </p>
                <p className="m-0 p-0">=======================</p>
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
                <p className="m-0 p-0">=======================</p>
                <p
                  style={{ textAlign: "center", fontWeight: "bold" }}
                  className="m-0 p-0"
                >
                  ==== DATOS DEL CLIENTE ====
                </p>
                <p className="m-0 p-0">=======================</p>
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

                <p className="m-0 p-0">=======================</p>
                <p
                  style={{ textAlign: "center", fontWeight: "bold" }}
                  className="m-0 p-0"
                >
                  ==== DETALLES DE PAGO ====
                </p>
                <p className="m-0 p-0">=======================</p>
                <p className="m-0 p-0">
                  <span style={{ fontWeight: "bold" }}>Monto: </span>
                  {parseFloat(paymentData.amount).toFixed(2)}$ USD
                </p>
                <p className="m-0 p-0">
                  <span style={{ fontWeight: "bold" }}>Id de Pago: </span>
                  {paymentData.pid}
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
