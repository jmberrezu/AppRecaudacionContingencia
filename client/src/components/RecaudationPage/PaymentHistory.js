import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Table,
  Button,
  Dropdown,
  DropdownButton,
  Row,
  Tab,
  Nav,
  Col,
  NavLink,
} from "react-bootstrap";
import { CaretUpFill, CaretDownFill } from "react-bootstrap-icons";

function PaymentHistory(props) {
  const { token, idcashpoint, user } = props;
  const [payments, setPayments] = useState([]);
  const [reversePayments, setReversePayments] = useState([]);
  const [sortedPayments, setSortedPayments] = useState([]);
  const [sortedReversePayments, setSortedReversePayments] = useState([]);
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

  // Función para ordenar los pagos anulados
  const sortReversePayments = useCallback(() => {
    let sortedReversePaymentsCopy = [...reversePayments];
    switch (sortBy) {
      case "Fecha":
        sortedReversePaymentsCopy.sort(
          (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)
        );
        break;
      case "Usuario":
        sortedReversePaymentsCopy.sort((a, b) =>
          sortDirection === "asc"
            ? a.username - b.username
            : b.username - a.username
        );
        break;
      default:
        break;
    }
    if (sortDirection === "desc") {
      sortedReversePaymentsCopy.reverse();
    }
    setSortedReversePayments(sortedReversePaymentsCopy);
  }, [reversePayments, sortBy, sortDirection]);

  // Función para agrupar los pagos por grupo
  const groupPayments = useCallback(() => {
    const groupedPaymentsObj = payments.reduce((acc, payment) => {
      const group = payment.cashpointpaymentgroupreferenceid;
      if (!acc[group]) {
        acc[group] = {
          payments: [],
          totalAmount: 0, // Agregar un campo para rastrear el monto total
        };
      }
      acc[group].payments.push(payment);
      acc[group].totalAmount += parseFloat(payment.paymentamountcurrencycode); // Sumar el monto al total del grupo
      return acc;
    }, {});
    setGroupedPayments(groupedPaymentsObj);
  }, [payments]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    sortReversePayments();
  }, [sortReversePayments]);

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

  const formatTime = (dateString) => {
    const options = { hour: "numeric", minute: "numeric", second: "numeric" };
    return new Date(dateString).toLocaleTimeString(undefined, options);
  };

  const handleSortBy = (sortType) => {
    setSortBy(sortType);
    toggleSortDirection();
  };

  const totalReversePaymentsAmount = reversePayments.reduce(
    (acc, payment) => acc + parseFloat(payment.paymentamountcurrencycode),
    0
  );

  return (
    <Container className="py-4">
      <Tab.Container id="left-tabs-example" defaultActiveKey="pagos">
        <Row className="mb-3">
          <Col>
            <Nav variant="tabs">
              <Nav.Item>
                <Nav.Link eventKey="pagos">Pagos</Nav.Link>
              </Nav.Item>
              {/* Llamo a  fetchReversePayments(); */}
              <Nav.Item onClick={fetchReversePayments}>
                <Nav.Link eventKey="anulados">Pagos Anulados</Nav.Link>
              </Nav.Item>
            </Nav>
          </Col>
        </Row>
        <Tab.Content>
          <Tab.Pane eventKey="pagos">
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
            <div style={{ height: "69vh", overflowY: "auto" }}>
              {Object.entries(groupedPayments).map(
                ([group, { payments, totalAmount }]) => (
                  <div key={group}>
                    <div class="row g-0">
                      <div class="col-sm-8">
                        <h5>
                          <strong>Grupo: </strong>
                          {group}
                        </h5>
                      </div>
                      <div class="col-sm-4 text-end ">
                        Monto Total del Grupo:{" "}
                        <strong className="text-primary">
                          {"$" + totalAmount.toFixed(2)}
                        </strong>
                      </div>
                    </div>
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
                              <td>{"$" + payment.paymentamountcurrencycode}</td>
                              <td>{payment.virtualcashpointname}</td>
                              <td>{payment.username}</td>
                            </tr>
                          ))}
                      </tbody>
                    </Table>
                    <hr />
                  </div>
                )
              )}
            </div>
          </Tab.Pane>
          <Tab.Pane eventKey="anulados">
            <Container className="py-4">
              <Row className="mb-3">
                <Col>
                  <DropdownButton
                    id="dropdown-basic-button-reverse"
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
              <div style={{ height: "63vh", overflowY: "auto" }}>
                <div className=" text-end mb-2">
                  Monto Total de Pagos Anulados:{" "}
                  <strong className="text-primary">
                    {"$" + totalReversePaymentsAmount.toFixed(2)}
                  </strong>
                </div>

                <Table striped bordered responsive>
                  <thead>
                    <tr>
                      <th>PID</th>
                      <th>Monto</th>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Usuario</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedReversePayments.map((payment) => (
                      <tr key={payment.paymenttransactionid}>
                        <td>{payment.paymenttransactionid}</td>
                        <td>{"$" + payment.paymentamountcurrencycode}</td>
                        <td>{formatDate(payment.fecha_hora)}</td>
                        <td>{formatTime(payment.fecha_hora)}</td>
                        <td>{payment.username}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <hr />
              </div>
            </Container>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </Container>
  );
}

export default PaymentHistory;
