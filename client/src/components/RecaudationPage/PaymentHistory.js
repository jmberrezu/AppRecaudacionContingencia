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

function PaymentHistory(props) {
  const { token, idcashpoint, user } = props;
  const [payments, setPayments] = useState([]);
  const [reversePayments, setReversePayments] = useState([]);
  const [sortedPayments, setSortedPayments] = useState([]);
  const [sortBy, setSortBy] = useState("Fecha");
  const [sortDirection, setSortDirection] = useState("asc");
  const [groupedPayments, setGroupedPayments] = useState({});

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

  // Funcion para obtener la lista de pagos anulados
  const fetchReversePayments = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/paymentRoutes/pagosAnulados/${idcashpoint}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const paymentsData = await response.json();

        setReversePayments(paymentsData);
        console.log(paymentsData);
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
    if (sortDirection === "desc") {
      sortedPaymentsCopy.reverse();
    }
    setSortedPayments(sortedPaymentsCopy);
  }, [payments, sortBy, sortDirection]);

  // Función para agrupar los pagos por grupo
  const groupPayments = useCallback(() => {
    const groupedPaymentsObj = payments.reduce((acc, payment) => {
      const group = payment.cashpointpaymentgroupreferenceid;
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(payment);
      return acc;
    }, {});
    setGroupedPayments(groupedPaymentsObj);
  }, [payments]);

  useEffect(() => {
    fetchPayments();
    fetchReversePayments();
  }, [fetchPayments, fetchReversePayments]);

  useEffect(() => {
    sortPayments();
  }, [sortPayments]);

  useEffect(() => {
    groupPayments();
  }, [groupPayments]);

  const toggleSortDirection = () => {
    setSortDirection((prevDirection) =>
      prevDirection === "asc" ? "desc" : "asc"
    );
  };

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "numeric", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleSortBy = (sortType) => {
    setSortBy(sortType);
    toggleSortDirection();
  };

  return (
    <Container className="py-4">
      <Row className="mb-3">
        <Col>
          <DropdownButton
            id="dropdown-basic-button"
            variant="outline-dark"
            title={`Ordenar por ${sortBy} ${
              sortDirection === "asc" ? "(ascendente)" : "(descendente)"
            }`}
          >
            <Dropdown.Item onClick={() => handleSortBy("Fecha")}>
              Fecha
              {sortBy === "Fecha" && sortDirection === "asc" && (
                <CaretUpFill className="ms-2" />
              )}
              {sortBy === "Fecha" && sortDirection === "desc" && (
                <CaretDownFill className="ms-2" />
              )}
            </Dropdown.Item>
            <Dropdown.Item onClick={() => handleSortBy("Caja")}>
              Caja
              {sortBy === "Caja" && sortDirection === "asc" && (
                <CaretUpFill className="ms-2" />
              )}
              {sortBy === "Caja" && sortDirection === "desc" && (
                <CaretDownFill className="ms-2" />
              )}
            </Dropdown.Item>
            <Dropdown.Item onClick={() => handleSortBy("Usuario")}>
              Usuario
              {sortBy === "Usuario" && sortDirection === "asc" && (
                <CaretUpFill className="ms-2" />
              )}
              {sortBy === "Usuario" && sortDirection === "desc" && (
                <CaretDownFill className="ms-2" />
              )}
            </Dropdown.Item>
          </DropdownButton>
        </Col>
      </Row>
      <div style={{ height: "70vh", overflowY: "auto" }}>
        {Object.entries(groupedPayments).map(([group, payments]) => (
          <div key={group}>
            <h5 className="h5">
              <strong>Grupo: </strong>
              {group}
            </h5>

            <Table striped bordered responsive>
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
                {sortedPayments
                  .filter(
                    (payment) =>
                      payment.cashpointpaymentgroupreferenceid === group
                  )
                  .map((payment) => (
                    <tr key={payment.paymenttransactionid}>
                      <td>{payment.paymenttransactionid}</td>
                      <td>{formatDate(payment.valuedate)}</td>
                      <td>{payment.paymentamountcurrencycode}</td>
                      <td>{payment.virtualcashpointname}</td>
                      <td>{payment.username}</td>
                    </tr>
                  ))}
              </tbody>
            </Table>
            <hr />
          </div>
        ))}
      </div>
    </Container>
  );
}

export default PaymentHistory;
