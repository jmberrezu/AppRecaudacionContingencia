import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "react-bootstrap";

function GenerateComprobant({
  user,
  paymentData,
  direccion,
  cuentaContrato,
  cliente,
}) {
  const conponentPDF = useRef();

  const generatePDF = useReactToPrint({
    content: () => conponentPDF.current,
    documentTitle: "Comprobante",
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
                fontWeight: "bold",
              }}
            >
              <div>
                <p className="m-0 p-0" style={{ textAlign: "center" }}>
                  COMPROBANTE DE PAGO
                </p>
                <p className="m-0 p-0">=======================</p>
                <p style={{ textAlign: "center" }} className="m-0 p-0">
                  ==== DATOS DEL CAJERO ====
                </p>
                <p className="m-0 p-0">=======================</p>
                <p className="m-0 p-0">Oficina: {user.idcashpoint}</p>
                <p className="m-0 p-0">
                  Caja: {user.idglobalvirtualcashpoint} |{" "}
                  {user.idvirtualcashpoint}
                </p>
                <p className="m-0 p-0">Cajero: {user.username}</p>
                <p className="m-0 p-0">
                  ID Cajero: {user.idglobaluser} | {user.id}
                </p>
                <p className="m-0 p-0">Fecha: {paymentData.date}</p>
                <p className="m-0 p-0">=======================</p>
                <p style={{ textAlign: "center" }} className="m-0 p-0">
                  ==== DATOS DEL CLIENTE ====
                </p>
                <p className="m-0 p-0">=======================</p>
                <p className="m-0 p-0">Cliente: {cliente.name}</p>
                <p className="m-0 p-0">Cuenta Contrato: {cuentaContrato}</p>
                <p className="m-0 p-0">Dirección: {direccion}</p>

                <p className="m-0 p-0">=======================</p>
                <p style={{ textAlign: "center" }} className="m-0 p-0">
                  ==== DETALLES DE PAGO ====
                </p>
                <p className="m-0 p-0">=======================</p>
                <p className="m-0 p-0">Pago: Efectivo</p>
                <p className="m-0 p-0">Id de Pago: {paymentData.pid}</p>
                <p className="m-0 p-0">
                  Monto: {parseFloat(paymentData.amount).toFixed(2)}$ USD
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline-success" onClick={generatePDF}>
            Imprimir Comprobante
          </Button>
        </div>
      )}
    </React.Fragment>
  );
}
export default GenerateComprobant;
