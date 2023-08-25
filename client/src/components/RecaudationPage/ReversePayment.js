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

function ReversePayment(props) {
  const { token, idcashpoint } = props;
  const [payments, setPayments] = useState([]);
  const [sortedPayments, setSortedPayments] = useState([]);
  const [sortBy, setSortBy] = useState("Fecha");
  const [sortDirection, setSortDirection] = useState("asc");

  // Función para obtener la lista de pagos
  const fetchPayments = useCallback(async () => {
    try {
      const response = await fetch(`/api/paymentRoutes/pagos/${idcashpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const paymentsData = await response.json();
        setPayments(paymentsData);
      }
    } catch (error) {
      console.error(error);
    }
  }, [idcashpoint, token]);

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
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    sortPayments();
  }, [sortPayments]);

  const toggleSortDirection = () => {
    setSortDirection((prevDirection) =>
      prevDirection === "asc" ? "desc" : "asc"
    );
  };

  const anularPago = async (id) => {
    console.log(id);
  };

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "numeric", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <Container className="py-4">
      <h1>Reverse Payment</h1>
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
      <div style={{ height: "70vh", overflowY: "auto" }}>
        <Table striped bordered responsive>
          <thead>
            <tr>
              <th>PID</th>
              <th>Fecha</th>
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
                <td>{formatDate(payment.valuedate)}</td>
                <td>{payment.paymentamountcurrencycode}</td>
                <td>{payment.idvirtualcashpoint}</td>
                <td>{payment.iduser}</td>
                <td>
                  <Button
                    variant="danger"
                    onClick={() => anularPago(payment.paymenttransactionid)}
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
