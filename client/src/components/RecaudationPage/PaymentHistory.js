import axios from "axios";
import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Table,
  Dropdown,
  DropdownButton,
  Row,
  Tab,
  Nav,
  Col,
  Button,
} from "react-bootstrap";
import { CaretUpFill, CaretDownFill } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import GenerateComprobant from "./GenerateComprobant";
import { Pagination } from "react-bootstrap";

function PaymentHistory({ user }) {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [payments, setPayments] = useState([]);
  const [reversePayments, setReversePayments] = useState([]);
  const [sortedPayments, setSortedPayments] = useState([]);
  const [sortedReversePayments, setSortedReversePayments] = useState([]);
  const [sortBy, setSortBy] = useState("Fecha");
  const [sortDirection, setSortDirection] = useState("desc");
  const [groupedPayments, setGroupedPayments] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Obtener el token del local storage
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

  useEffect(() => {
    const filtered = payments.filter((payment) => {
      const searchValue = searchQuery.toLowerCase();
      return (
        payment.payercontractaccountid.toLowerCase().includes(searchValue) ||
        payment.paymenttransactionid
          .toString()
          .toLowerCase()
          .includes(searchValue)
      );
    });

    setFilteredPayments(filtered);
    setIsSearching(searchQuery.length > 0);
  }, [searchQuery, payments]);

  // Funcion para obtener el mensaje del servidor
  const getMessage = useCallback(async () => {
    if (user.idcashpoint)
      try {
        const response = await fetch(
          `http://localhost:5000/api/supervisor/printmessage/${user.idcashpoint}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.ok) {
          const messageData = await response.json();
          setMessage(messageData);
        }
      } catch (error) {
        console.error(error);
      }
  }, [user.idcashpoint, token]);

  // Obtener el mensaje del servidor
  useEffect(() => {
    // Si hay usuario o token
    if (user.idcashpoint && token) {
      getMessage();
    }
  }, [getMessage, token, user.idcashpoint]);

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

  // Funcion para obtener la lista de pagos anulados
  const fetchReversePayments = useCallback(async () => {
    if (user.idcashpoint) {
      try {
        const response = await fetch(
          `http://localhost:5000/api/paymentRoutes/pagosAnulados/${user.idcashpoint}`,
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
    if (sortDirection === "desc") {
      sortedPaymentsCopy.reverse();
    }
    // Aplicar paginación
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    sortedPaymentsCopy = sortedPaymentsCopy.slice(startIndex, endIndex);

    setSortedPayments(sortedPaymentsCopy);
  }, [payments, sortBy, sortDirection, currentPage]);

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
    if (token) {
      fetchPayments();
    }
  }, [token, user.idcashpoint, fetchPayments]);

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

  const formatTime2 = (dateString) => {
    const options = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    };
    return new Date(dateString).toLocaleTimeString(undefined, options);
  };

  const handleSortBy = (sortType) => {
    setSortBy(sortType);
    toggleSortDirection();
  };

  const handleExportClick = async () => {
    try {
      // Realizar una solicitud GET para descargar el archivo CSV
      const response = await axios.get(
        `http://localhost:5000/api/paymentRoutes/exportar-pagos/${user.idcashpoint}`,
        {
          responseType: "blob", // Solicitar una respuesta en formato binario
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Crear una URL para el archivo descargado
      const url = window.URL.createObjectURL(new Blob([response.data]));

      // Crear un enlace para descargar el archivo
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Pagos-${new Date()
          .toLocaleString()
          .replace(/[/:]/g, "-")
          .replace(/,/g, "")
          .replace(/ /g, "-")}.csv`
      );

      // Hacer clic en el enlace para iniciar la descarga
      link.click();

      // Liberar la URL del objeto creado
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al exportar pagos:", error);
    }
  };

  // Obtener el monto total de los pagos anulados
  const totalReversePaymentsAmount = reversePayments.reduce(
    (acc, payment) => acc + parseFloat(payment.paymentamountcurrencycode),
    0
  );

  // Función para cambiar de página
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Calcular el número total de páginas de acuerdo a si son pagos o anulados
  const totalPages = Math.ceil(payments.length / itemsPerPage);

  // Calcular el rango de paginas a mostrar
  const pageRange = 6;
  let startPage = currentPage - Math.floor(pageRange / 2);
  if (startPage < 1) {
    startPage = 1;
  }
  let endPage = startPage + pageRange - 1;
  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = endPage - pageRange + 1;
    if (startPage < 1) {
      startPage = 1;
    }
  }

  const paginationItems = [];

  if (currentPage > 1) {
    paginationItems.push(
      <Pagination.First key="first" onClick={() => handlePageChange(1)} />
    );
    paginationItems.push(
      <Pagination.Prev
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
      />
    );
  }

  if (startPage > 1) {
    paginationItems.push(<Pagination.Ellipsis key="ellipsis-start" disabled />);
  }

  for (let number = startPage; number <= endPage; number++) {
    paginationItems.push(
      <Pagination.Item
        key={number}
        active={number === currentPage}
        onClick={() => handlePageChange(number)}
      >
        {number}
      </Pagination.Item>
    );
  }

  if (endPage < totalPages) {
    paginationItems.push(<Pagination.Ellipsis key="ellipsis-end" disabled />);
  }

  if (currentPage < totalPages) {
    paginationItems.push(
      <Pagination.Next
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
      />
    );
    paginationItems.push(
      <Pagination.Last
        key="last"
        onClick={() => handlePageChange(totalPages)}
      />
    );
  }

  return (
    <Container className="py-4">
      <Tab.Container id="left-tabs-example" defaultActiveKey="pagos">
        <Row className="mb-3">
          <Col>
            <Nav variant="tabs">
              <Nav.Item onClick={fetchPayments}>
                <Nav.Link eventKey="pagos">Pagos</Nav.Link>
              </Nav.Item>
              <Nav.Item onClick={fetchReversePayments}>
                <Nav.Link eventKey="anulados">Pagos Anulados</Nav.Link>
              </Nav.Item>
              {user.role === "gerente" && (
                <Nav.Item>
                  <Nav.Link eventKey="exportar">Exportar Pagos</Nav.Link>
                </Nav.Item>
              )}
            </Nav>
          </Col>
        </Row>
        <Tab.Content>
          <Tab.Pane eventKey="exportar">
            <h2>Exportar Pagos</h2>
            <hr />
            <Button
              onClick={() => {
                handleExportClick();
              }}
              variant="outline-success"
            >
              Exportar Pagos
            </Button>
          </Tab.Pane>
          <Tab.Pane eventKey="pagos">
            <div className="mb-3 input-group input-group-lg justify-content-center">
              <input
                type="text"
                className="form-control"
                style={{ maxWidth: "50%" }}
                placeholder="Buscar por cuenta contrato o ID de pago"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
              />
            </div>
            <div
              className="pe-3 mb-3"
              style={{ height: "61vh", overflowY: "auto" }}
            >
              <Row className="mb-3">
                <Col>
                  {!isSearching && ( // Condición para mostrar el dropdown de ordenación
                    <DropdownButton
                      id="dropdown-basic-button"
                      variant="outline-dark"
                      title={`Ordenar por ${sortBy} ${
                        sortDirection === "asc"
                          ? "(ascendente)"
                          : "(descendente)"
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
                  )}
                </Col>
              </Row>
              {isSearching ? (
                // Mostrar los pagos filtrados por búsqueda
                <Table striped bordered responsive>
                  <thead>
                    <tr>
                      <th>PID</th>
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
                    {filteredPayments.map((payment) => (
                      <tr key={payment.paymenttransactionid}>
                        <td>{payment.paymenttransactionid}</td>
                        <td>{payment.payercontractaccountid}</td>
                        <td>{formatDate(payment.valuedate)}</td>
                        <td>{formatTime(payment.valuedate)}</td>
                        <td>{"$" + payment.paymentamountcurrencycode}</td>
                        <td>{payment.virtualcashpointname}</td>
                        <td>{payment.username}</td>
                        <td>
                          <GenerateComprobant
                            user={user}
                            paymentData={{
                              pid: payment.paymenttransactionid,
                              date: formatDate(payment.valuedate),
                              time: formatTime2(payment.valuedate),
                              amount: payment.paymentamountcurrencycode,
                            }}
                            direccion={payment.cliente.address}
                            cuentaContrato={payment.payercontractaccountid}
                            cliente={payment.cliente}
                            esReimpresion={true}
                            onCloseModal={fetchPayments}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                // Mostrar los pagos agrupados por grupo
                Object.entries(groupedPayments).map(
                  ([group, { payments, totalAmount }]) => (
                    <div key={group}>
                      <div className="row g-0">
                        <div className="col-sm-8">
                          <h5>
                            <strong>Grupo: </strong>
                            {group}
                          </h5>
                        </div>
                        <div className="col-sm-4 text-end ">
                          Total de Pagos:{" "}
                          <strong className="text-primary">
                            {payments.length}
                          </strong>
                          <span className="mx-2">|</span>
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
                          {sortedPayments
                            .filter(
                              (payment) =>
                                payment.cashpointpaymentgroupreferenceid ===
                                group
                            )
                            .map((payment) => (
                              <tr key={payment.paymenttransactionid}>
                                <td>{payment.paymenttransactionid}</td>
                                <td>{payment.payercontractaccountid}</td>
                                <td>{formatDate(payment.valuedate)}</td>
                                <td>{formatTime(payment.valuedate)}</td>
                                <td>
                                  {"$" + payment.paymentamountcurrencycode}
                                </td>
                                <td>{payment.virtualcashpointname}</td>
                                <td>{payment.username}</td>
                                <td>
                                  <GenerateComprobant
                                    user={user}
                                    paymentData={{
                                      pid: payment.paymenttransactionid,
                                      date: formatDate(payment.valuedate),
                                      time: formatTime2(payment.valuedate),
                                      amount: payment.paymentamountcurrencycode,
                                    }}
                                    direccion={payment.cliente.address}
                                    cuentaContrato={
                                      payment.payercontractaccountid
                                    }
                                    cliente={payment.cliente}
                                    esReimpresion={true}
                                    message={message}
                                    onCloseModal={fetchPayments}
                                  />
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </Table>
                      <hr />
                    </div>
                  )
                )
              )}
            </div>
            {/* Solo si no se esta buscando */}
            {!isSearching && (
              <div className="d-flex justify-content-center">
                <Pagination>{paginationItems}</Pagination>
              </div>
            )}
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
                      <th>Cuenta Contrato</th>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Monto</th>
                      <th>Usuario</th>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedReversePayments.map((payment) => (
                      <tr key={payment.paymenttransactionid}>
                        <td>{payment.paymenttransactionid}</td>
                        <td>{payment.payercontractaccountid}</td>
                        <td>{formatDate(payment.fecha_hora)}</td>
                        <td>{formatTime(payment.fecha_hora)}</td>
                        <td>{"$" + payment.paymentamountcurrencycode}</td>
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
