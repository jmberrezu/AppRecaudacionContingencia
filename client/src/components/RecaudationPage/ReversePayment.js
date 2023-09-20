import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Table,
  Button,
  Dropdown,
  DropdownButton,
  Row,
  Col,
} from "react-bootstrap";
import { CaretUpFill, CaretDownFill } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function ReversePayment({ user }) {
  const [payments, setPayments] = useState([]);
  const [sortedPayments, setSortedPayments] = useState([]);
  const [sortBy, setSortBy] = useState("Fecha");
  const [sortDirection, setSortDirection] = useState("asc");
  const navigate = useNavigate();
  const [token, setToken] = useState(null);

  // Verificar el token
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      axios
        .get("http://localhost:5000/api/login/verify", {
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

  // Función para obtener la lista de pagos
  const fetchPayments = useCallback(async () => {
    if (user.idcashpoint) {
      try {
        const response = await fetch(
          `http://localhost:5000/api/paymentRoutes/pagos/${user.idcashpoint}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const paymentsData = await response.json();
          setPayments(paymentsData);
        }
      } catch (error) {
        console.error(error);
      }
    }
  }, [token, user.idcashpoint]);

  // Función para ordenar los pagos
  const sortPayments = useCallback(() => {
    let sortedPaymentsCopy = [...payments];
    switch (sortBy) {
      case "Fecha":
        sortedPaymentsCopy.sort(
          (a, b) => new Date(a.valuedate) - new Date(b.valuedate)
        );
        break;
      case "Caja":
        sortedPaymentsCopy.sort((a, b) =>
          sortDirection === "asc"
            ? a.idvirtualcashpoint - b.idvirtualcashpoint
            : b.idvirtualcashpoint - a.idvirtualcashpoint
        );
        break;
      case "Usuario":
        sortedPaymentsCopy.sort((a, b) =>
          sortDirection === "asc" ? a.iduser - b.iduser : b.iduser - a.iduser
        );
        break;
      default:
        break;
    }
    setSortedPayments(sortedPaymentsCopy);
  }, [payments, sortBy, sortDirection]);

  useEffect(() => {
    if (token) {
      fetchPayments();
    }
  }, [token, user.idcashpoint, fetchPayments]);

  useEffect(() => {
    sortPayments();
  }, [sortPayments]);

  const toggleSortDirection = () => {
    setSortDirection((prevDirection) =>
      prevDirection === "asc" ? "desc" : "asc"
    );
  };

  const anularPago = async (pid, ammount, contractaccount) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/paymentRoutes/anular-pago/${pid}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user,
            ammount,
            contractaccount,
          }),
        }
      );

      if (response.ok) {
        fetchPayments();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "numeric", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatTime = (dateString) => {
    const options = { hour: "numeric", minute: "numeric", second: "numeric" };
    return new Date(dateString).toLocaleTimeString(undefined, options);
  };

  return (
    <Container className="py-4">
      <h1>Anular Pago</h1>
      <Container className="my-3">
        <Row className="justify-content-between">
          <Col xs={6} className="text-start">
            <DropdownButton
              id="sort-dropdown"
              title={`Ordenar por ${sortBy}`}
              variant="outline-dark"
            >
              <Dropdown.Item onClick={() => setSortBy("Fecha")}>
                Fecha
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setSortBy("Caja")}>
                Caja
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setSortBy("Usuario")}>
                Usuario
              </Dropdown.Item>
            </DropdownButton>
          </Col>
          <Col xs={6} className="text-end">
            <Button variant="outline-dark" onClick={toggleSortDirection}>
              {sortDirection === "asc" ? (
                <span>
                  Ascendente <CaretUpFill className="align-middle mb-1" />
                </span>
              ) : (
                <span>
                  Descendente <CaretDownFill className="align-middle mb-1" />
                </span>
              )}
            </Button>
          </Col>
        </Row>
      </Container>
      <div style={{ height: "68vh", overflowY: "auto" }}>
        <Table striped bordered responsive>
          <thead>
            <tr>
              <th>PID</th>
              <th>Grupo</th>
              <th>Cuenta Contrato</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Monto</th>
              <th>Caja</th>
              <th>Usuario</th>

              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedPayments.map((payment) => (
              <tr key={payment.paymenttransactionid}>
                <td>{payment.paymenttransactionid}</td>
                <td>{payment.cashpointpaymentgroupreferenceid}</td>
                <td>{payment.payercontractaccountid}</td>
                <td>{formatDate(payment.valuedate)}</td>
                <td>{formatTime(payment.valuedate)}</td>
                <td>{payment.paymentamountcurrencycode}</td>
                <td>{payment.virtualcashpointname}</td>
                <td>{payment.username}</td>
                <td>
                  <Button
                    variant="danger"
                    onClick={() =>
                      anularPago(
                        payment.paymenttransactionid,
                        payment.paymentamountcurrencycode,
                        payment.payercontractaccountid
                      )
                    }
                  >
                    Anular Pago
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

export default ReversePayment;
