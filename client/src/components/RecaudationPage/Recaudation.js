import React, { useState, useEffect } from "react";
import { Button, Container, Table } from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Payment from "./Payment";
import CashClose from "./CashClose";
import ReverseCashClose from "./ReverseCashClose";
import ReversePayment from "./ReversePayment";
import Sidebar from "./Sidebar";
import PaymentHistory from "./PaymentHistory";
import CashCloseHistory from "./CashCloseHistory";
import { Modal } from "react-bootstrap";
import { useCallback } from "react";
import { useRef } from "react";
import { ArrowLeftRight } from "react-bootstrap-icons";

function Recaudation() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeComponent, setActiveComponent] = useState("payment"); // Inicialmente muestra el componente Payment
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [token, setToken] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [virtualCashPoints, setVirtualCashPoints] = useState([]);
  const isGerente = useRef(null); // Use useRef to create a mutable reference

  // Para mostrar la fecha y hora actual
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
            // Guardar el usuario
            setUser(response.data);
            // Si es gerente coloco como true
            if (response.data.role === "gerente") {
              isGerente.current = true;
            }
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

  // Cerrar sesión
  const handleLogout = async () => {
    // Limpiar el token y redirigir al inicio de sesión
    localStorage.removeItem("token");
    try {
      await axios.delete(`http://localhost:5000/api/login/logout`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error(error);
    }
    navigate("/");
  };

  // Función para obtener la lista de cajas virtuales
  const fetchVirtualCashPoints = useCallback(async () => {
    // si es gerente
    if (isGerente) {
      try {
        let response = await axios.get(
          `http://localhost:5000/api/virtualcashpoints/${user.idcashpoint}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setVirtualCashPoints(response.data);
      } catch (error) {
        console.error(error);
      }
    }
  }, [token, user, isGerente]);

  // Obtengo el grupo de pago
  useEffect(() => {
    if (token && user) {
      fetchVirtualCashPoints();
    }
  }, [token, user, fetchVirtualCashPoints]);

  // Función para cambiar la caja virtual
  const handleChangeVirtualCashPoint = async (idGlobalVirtualCashPoint) => {
    try {
      await axios.put(
        `http://localhost:5000/api/users/changeVirtualCashPoint/${user.idglobaluser}`,
        {
          newidglobalvirtualcashpoint: idGlobalVirtualCashPoint,
          idcashpoint: user.idcashpoint,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      navigate("/");
    } catch (error) {
      console.error(error);
    }
  };

  const handleShowModal = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <div className="d-flex">
      <Sidebar
        user={user}
        handleLogout={handleLogout}
        setActiveComponent={setActiveComponent}
        activeComponent={activeComponent}
      />
      <Container fluid className="my-3">
        <div className="d-flex flex-wrap align-items-center px-4 ">
          <div className="me-auto d-flex align-items-center  text-nowrap">
            <nav
              style={{ "--bs-breadcrumb-divider": '" > "' }}
              aria-label="breadcrumb"
            >
              <ol className="breadcrumb fs-2 mb-0">
                <li className="breadcrumb-item active ">
                  Página de Recaudación
                </li>
                {/* Si es gerente, mostrar el nombre de la caja virtual */}
                {isGerente.current && (
                  <li
                    className="breadcrumb-item text-primary"
                    aria-current="page"
                    onClick={handleShowModal}
                    style={{ cursor: "pointer" }}
                  >
                    <span>{user?.virtualcashpointname}</span>
                    <Button
                      variant="outline-primary rounded"
                      size="sm"
                      className="align-middle mb-2 ms-2"
                    >
                      Cambiar
                      <ArrowLeftRight
                        style={{ fontSize: "0.9em" }}
                        className="align-middle ms-1"
                      />
                    </Button>
                  </li>
                )}
                {/* Si es cajero, mostrar el nombre de la caja */}
                {!isGerente.current && (
                  <li
                    className="breadcrumb-item text-primary"
                    aria-current="page"
                  >
                    <span>{user?.virtualcashpointname}</span>
                  </li>
                )}
              </ol>
            </nav>
          </div>

          <div className="h5 d-none d-xl-block d-flex align-items-center mb-2">
            <strong className="pe-2">Fecha: </strong>
            <span className="text-sm">
              {currentDateTime.toLocaleDateString()}
            </span>
          </div>
          <div className="h5 mx-4 d-none d-xl-block d-flex align-items-center mb-2">
            <strong>|</strong>
          </div>
          <div className="h5 d-none d-xl-block d-flex align-items-center mb-2">
            <strong className="pe-2">Hora: </strong>
            <span className="text-sm">
              {currentDateTime.toLocaleTimeString()}
            </span>
          </div>
        </div>

        <hr />
        {activeComponent === "payment" && <Payment user={user} />}
        {activeComponent === "cashClose" && <CashClose user={user} />}
        {activeComponent === "reversePayment" && <ReversePayment user={user} />}
        {activeComponent === "reverseCashClose" && (
          <ReverseCashClose user={user} />
        )}
        {activeComponent === "history" && <PaymentHistory user={user} />}
        {activeComponent === "history-closed" && (
          <CashCloseHistory user={user} />
        )}
      </Container>
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Cambiar Caja</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table striped bordered hover table-sm>
            <thead>
              <tr>
                <th>Caja</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {virtualCashPoints.map((virtualCashPoint) => (
                <tr key={virtualCashPoint.idglobalvirtualcashpoint}>
                  <td>{virtualCashPoint.name}</td>
                  <td>
                    <Button
                      variant="primary"
                      onClick={() =>
                        handleChangeVirtualCashPoint(
                          virtualCashPoint.idglobalvirtualcashpoint
                        )
                      }
                    >
                      Cambiar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Recaudation;
