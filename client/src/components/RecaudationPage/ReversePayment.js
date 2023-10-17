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
import { Pagination } from "react-bootstrap";

function ReversePayment({ user }) {
  const [payments, setPayments] = useState([]);
  const [sortedPayments, setSortedPayments] = useState([]);
  const [sortBy, setSortBy] = useState("Fecha");
  const [sortDirection, setSortDirection] = useState("asc");
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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
    if (sortDirection === "desc") {
      sortedPaymentsCopy.reverse();
    }

    // Aplicar la paginación
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    sortedPaymentsCopy = sortedPaymentsCopy.slice(startIndex, endIndex);

    setSortedPayments(sortedPaymentsCopy);
  }, [payments, sortBy, sortDirection, currentPage]);

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

  const handleSortBy = (sortType) => {
    setSortBy(sortType);
    toggleSortDirection();
  };

  // Función para cambiar de página
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Calcular el número de páginas
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);

  // Calcular el rango de páginas a mostrar (por ejemplo, mostrar 6 páginas alrededor de la página actual)
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

  // Mostrar los elementos de paginación
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
    <Container className="py-4 ">
      <h1>Anular Pago</h1>
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
      <div className="pe-3" style={{ height: "68vh", overflowY: "auto" }}>
        <Row className="mb-3">
          <Col>
            {!isSearching && ( // Condición para mostrar el dropdown de ordenación
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
            )}
          </Col>
        </Row>
        {isSearching ? (
          // Condición para mostrar la tabla de pagos filtrados
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
              {filteredPayments.map((payment) => (
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
        ) : (
          // Condición para mostrar la tabla de pagos ordenados
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
        )}
        {!isSearching && (
          // Condición para mostrar la paginación
          <Pagination className="justify-content-center">
            {paginationItems}
          </Pagination>
        )}
      </div>
    </Container>
  );
}

export default ReversePayment;
