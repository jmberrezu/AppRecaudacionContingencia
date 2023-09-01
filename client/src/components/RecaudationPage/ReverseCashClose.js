import React, { useState, useCallback, useEffect } from "react";
import { Table, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function ReverseCashClose({ user }) {
  const [closedCash, setClosedCash] = useState([]);
  const [token, setToken] = useState(null);
  const navigate = useNavigate();

  // Obtengo el token del local storage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      axios
        .get("/api/login/verify", {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })
        .then((response) => {
          // Verificar el rol del usuario
          if (
            response.data.role !== "cajero" &&
            response.data.role !== "gerente"
          ) {
            navigate("/");
          } else {
            setToken(storedToken);
          }
        })
        .catch((error) => {
          console.error("Error verifying token: ", error);
          navigate("/");
        });
    } else {
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    if (token) {
      fetchClosedCash();
    }
  }, [token, user.idcashpoint]);

  // Función para obtener la lista cajas cerradas
  const fetchClosedCash = useCallback(async () => {
    if (user.idcashpoint) {
      try {
        const response = await fetch(
          `/api/cashClose/closedcash/${user.idcashpoint}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const closedCashData = await response.json();
          setClosedCash(closedCashData);
        }
      } catch (error) {
        console.error(error);
      }
    }
  });

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "numeric", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const anularCierreCaja = async (cash) => {
    try {
      const response = await fetch(
        `/api/cashClose/anular-cierre-caja/${cash.cashpointpaymentgroupreferenceid}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user,
          }),
        }
      );

      if (response.ok) {
        fetchClosedCash();
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ height: "63vh", overflowY: "auto" }}>
      <h3>Lista de Cajas Cerradas:</h3>
      <Table striped bordered responsive>
        <thead>
          <tr>
            <th>Grupo</th>
            <th>Fecha</th>
            <th>Monto Cerrado</th>
            <th>Caja</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {closedCash.map((cash) => (
            <tr key={cash.cashpointpaymentgroupreferenceid}>
              <td>{cash.cashpointpaymentgroupreferenceid}</td>
              <td>{formatDate(cash.valuedate)}</td>
              <td>{"$" + cash.closingdoccumentamount}</td>
              <td>{cash.virtualcashpointname}</td>
              <td>
                <Button variant="danger" onClick={() => anularCierreCaja(cash)}>
                  Anular Cierre
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

export default ReverseCashClose;
