import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Table } from "react-bootstrap";

function SentHistory({ idcashpoint }) {
  // Para cajas enviadas
  const [cashClose, setCashClose] = useState([]);
  const navigate = useNavigate();
  const [token, setToken] = useState("");

  // Obtener el token del local storage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      axios
        .get("/api/supervisor/verify", {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
        .then((response) => {
          // Verificar el rol de supervisor
          if (response.data.role !== "supervisor") {
            navigate("/supervisor");
          } else {
            // Guardar el token
            setToken(storedToken);
          }
        })
        .catch((error) => {
          // Si el token no es válido, redirigir al inicio de sesión
          console.error("Error verifying token: ", error);
          navigate("/");
        });
    } else {
      // Si no hay token, redirigir al inicio de sesión
      navigate("/");
    }
  }, [navigate]);

  // Obtener la lista de cajas enviadas
  useEffect(() => {
    if (token) {
      getCashCloseHistory();
    }
  }, [token, idcashpoint]);

  // Funcion para obtener la lista de cajas enviadas
  const getCashCloseHistory = useCallback(async () => {
    if (idcashpoint)
      try {
        const response = await fetch(
          `/api/supervisor/cashclosehistorywithpayments/${idcashpoint}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.ok) {
          const cashCloseData = await response.json();
          setCashClose(cashCloseData);
        }
      } catch (error) {
        console.error(error);
      }
  });

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "numeric", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div style={{ height: "81vh", overflowY: "auto" }}>
      <h3>Historial de Cajas Enviadas</h3>
      {cashClose.map((cashClose) => (
        <div key={cashClose.cashpointpaymentgroupreferenceid}>
          <h5>Grupo: {cashClose.cashpointpaymentgroupreferenceid}</h5>
          <Table bordered responsive>
            <thead>
              <tr>
                <th>Fecha de Cierre de Caja</th>
                <th>Monto Cerrado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{formatDate(cashClose.valuedate)}</td>
                <td>
                  {"$" +
                    parseFloat(cashClose.closingdoccumentamount).toFixed(2)}
                </td>
              </tr>
              <tr>
                <td colSpan={3}>
                  <Table responsive bordered className="table-light m-0">
                    <thead>
                      <tr>
                        <th>PID</th>
                        <th>Fecha</th>
                        <th>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashClose.pagos.map((cashpointpayment) => (
                        <tr>
                          <td>{cashpointpayment.paymenttransactionid}</td>
                          <td>{formatDate(cashpointpayment.valuedate)}</td>
                          <td>
                            {"$" +
                              parseFloat(
                                cashpointpayment.paymentamountcurrencycode
                              ).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </td>
              </tr>
            </tbody>
          </Table>
        </div>
      ))}
    </div>
  );
}

export default SentHistory;
