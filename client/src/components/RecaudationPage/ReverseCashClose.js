import React, { useState, useCallback, useEffect } from "react";
import { Table, Button, Container } from "react-bootstrap";
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
        .get("http://localhost:5000/api/login/verify", {
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

  // Función para obtener la lista cajas cerradas
  const fetchClosedCash = useCallback(async () => {
    if (user.idcashpoint) {
      try {
        const response = await fetch(
          `http://localhost:5000/api/cashClose/closedcash/${user.idcashpoint}`,
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
  }, [token, user.idcashpoint]);

  useEffect(() => {
    if (token) {
      fetchClosedCash();
    }
  }, [token, user.idcashpoint, fetchClosedCash]);

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "numeric", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const anularCierreCaja = async (cash) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/cashClose/anular-cierre-caja/${cash.cashpointpaymentgroupreferenceid}`,
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
    <Container className="py-4">
      <h1>Anular Cierre de Caja</h1>
      <div className="mt-4" style={{ height: "63vh", overflowY: "auto" }}>
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
                <td
                  className={
                    parseFloat(cash.closingdoccumentamount) ===
                    parseFloat(cash.realclosingdoccumentamount)
                      ? "text-success"
                      : "text-danger"
                  }
                >
                  {"$" + parseFloat(cash.closingdoccumentamount).toFixed(2)}
                  {parseFloat(cash.closingdoccumentamount) !==
                    parseFloat(cash.realclosingdoccumentamount) &&
                    ` (Existe diferencia: ${
                      (parseFloat(cash.closingdoccumentamount) -
                        parseFloat(cash.realclosingdoccumentamount) >
                      0
                        ? "+"
                        : "") +
                      (
                        parseFloat(cash.closingdoccumentamount) -
                        parseFloat(cash.realclosingdoccumentamount)
                      ).toFixed(2)
                    }$ )`}
                </td>
                <td>{cash.virtualcashpointname}</td>
                <td>
                  <Button
                    variant="danger"
                    onClick={() => anularCierreCaja(cash)}
                  >
                    Anular Cierre
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Container>
  );
}

export default ReverseCashClose;
