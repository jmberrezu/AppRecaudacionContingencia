import axios from "axios";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Table } from "react-bootstrap";

function CashCloseHistory({ user }) {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [cashClose, setCashClose] = useState([]);

  // Obtener el token del local storage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      axios
        .get("/api/login/verify", {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
        .then((response) => {
          // Verificar el rol ya sea cajero o gerente
          if (
            response.data.role !== "cajero" &&
            response.data.role !== "gerente"
          ) {
            navigate("/");
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

  // Funcion para obtener la lista de cierres de caja
  const getCashCloseHistory = useCallback(async () => {
    if (user.idcashpoint)
      try {
        const response = await fetch(
          `/api/cashClose/closedcashwithpayments/${user.idcashpoint}`,
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

  // Obtener la lista de cierres de caja
  useEffect(() => {
    if (token) {
      getCashCloseHistory();
    }
  }, [token, user.idcashpoint]);

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "numeric", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div>
      <h3 className="mb-3">Historial de Cierres de Caja</h3>
      <div className="p-4" style={{ height: "80vh", overflowY: "auto" }}>
        {cashClose.map((cashClose) => (
          <div key={cashClose.cashpointpaymentgroupreferenceid}>
            <h5>Grupo: {cashClose.cashpointpaymentgroupreferenceid}</h5>
            <Table bordered responsive>
              <thead>
                <tr>
                  <th>Fecha de Cierre de Caja</th>
                  <th>Monto Cerrado</th>
                  <th>Caja</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{formatDate(cashClose.valuedate)}</td>
                  <td>{"$" + cashClose.closingdoccumentamount}</td>
                  <td>{cashClose.virtualcashpointname}</td>
                </tr>
                <tr>
                  <td colSpan={3}>
                    <Table
                      responsive
                      bordered
                      className="table-light m-0 table-sm"
                    >
                      <thead>
                        <tr>
                          <th>PID</th>
                          <th>Fecha</th>
                          <th>Monto</th>
                          <th>Caja</th>
                          <th>Usuario</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashClose.pagos.map((cashpointpayment) => (
                          <tr>
                            <td>{cashpointpayment.paymenttransactionid}</td>
                            <td>{formatDate(cashpointpayment.valuedate)}</td>
                            <td>
                              {"$" + cashpointpayment.paymentamountcurrencycode}
                            </td>
                            <td>{cashpointpayment.virtualcashpointname}</td>
                            <td>{cashpointpayment.username}</td>
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
    </div>
  );
}

export default CashCloseHistory;
