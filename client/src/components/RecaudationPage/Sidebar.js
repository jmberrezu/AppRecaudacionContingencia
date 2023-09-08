import React, { useState, useEffect } from "react";
import { Nav, Button, Form } from "react-bootstrap";
import { Link } from "react-router-dom";
import {
  CashStack,
  Folder2Open,
  PersonCircle,
  Tools,
  BoxSeam,
  ArrowCounterclockwise,
  ArrowLeftRight,
  ClockHistory,
  HourglassSplit,
} from "react-bootstrap-icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Sidebar({ user, handleLogout, setActiveComponent, activeComponent }) {
  const isGerente = user && user.role === "gerente";
  const [virtualCashPoints, setVirtualCashPoints] = useState([]);
  const [idGlobalVirtualCashPoint, setIdGlobalVirtualCashPoint] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  // Obtengo el grupo de pago
  useEffect(() => {
    if (token && user) {
      fetchVirtualCashPoints();
    }
  }, [token, user]);

  // Función para obtener la lista de cajas virtuales
  const fetchVirtualCashPoints = async () => {
    try {
      let response = await axios.get(
        `/api/virtualcashpoints/${user.idcashpoint}`,
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
  };

  // Función para cambiar la caja virtual
  const handleChangeVirtualCashPoint = async (idGlobalVirtualCashPoint) => {
    try {
      await axios.put(
        `/api/users/changeVirtualCashPoint/${user.idglobaluser}`,
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

  return (
    <div
      className="d-flex flex-column flex-shrink-0 p-3 bg-body-tertiary"
      style={{ width: "282px", height: "100vh" }}
    >
      <span className="fs-4">App Recaudación</span>
      <hr />
      <Nav className="nav nav-pills flex-column mb-auto">
        <strong className="mb-2">Pagos</strong>
        <Nav.Item>
          <Link
            to="#"
            className={`nav-link ${
              activeComponent === "payment" ? "active" : "text-black"
            }`}
            onClick={() => setActiveComponent("payment")}
          >
            <CashStack size={16} className="align-middle mb-1 me-2" /> Realizar
            Pago
          </Link>
        </Nav.Item>
        {isGerente && (
          <Nav.Item>
            <Link
              to="#"
              className={`nav-link ${
                activeComponent === "reversePayment" ? "active" : "text-black"
              } `}
              onClick={() => setActiveComponent("reversePayment")}
            >
              <ArrowCounterclockwise
                size={16}
                className="align-middle mb-1 me-2"
              />{" "}
              Anular Pago
            </Link>
          </Nav.Item>
        )}
        <hr />
        <strong className="mb-2">Caja</strong>
        <Nav.Item>
          <Link
            to="#"
            className={`nav-link ${
              activeComponent === "cashClose" ? "active" : "text-black"
            } `}
            onClick={() => setActiveComponent("cashClose")}
          >
            <Folder2Open size={16} className="align-middle mb-1 me-2" /> Cerrar
            Caja
          </Link>
        </Nav.Item>
        {isGerente && (
          <Nav.Item>
            <Link
              to="#"
              className={`nav-link ${
                activeComponent === "reverseCashClose" ? "active" : "text-black"
              } `}
              onClick={() => setActiveComponent("reverseCashClose")}
            >
              <ArrowLeftRight size={16} className="align-middle mb-1 me-2" />{" "}
              Anular Cierre de Caja
            </Link>
          </Nav.Item>
        )}
        <hr />
        <strong className="mb-2">Historial</strong>

        <Nav.Item>
          <Link
            to="#"
            className={`nav-link ${
              activeComponent === "history" ? "active" : "text-black"
            } `}
            onClick={() => setActiveComponent("history")}
          >
            <ClockHistory size={16} className="align-middle mb-1 me-2" />{" "}
            Historial de Pagos
          </Link>
        </Nav.Item>
        <Nav.Item>
          <Link
            to="#"
            className={`nav-link ${
              activeComponent === "history-closed" ? "active" : "text-black"
            } `}
            onClick={() => setActiveComponent("history-closed")}
          >
            <HourglassSplit size={16} className="align-middle mb-1 me-2" />{" "}
            Historial de Cajas Cerradas
          </Link>
        </Nav.Item>
      </Nav>

      <div className="mt-auto">
        <hr />{" "}
        {user ? (
          <Nav className="nav nav-pills flex-column mb-auto">
            <Nav.Item className="mb-2 ms-3">
              <PersonCircle size={16} className="align-middle mb-1 me-3" />
              Usuario: <strong>{user.username}</strong>
            </Nav.Item>
            <Nav.Item className="mb-2  ms-3">
              <Tools size={16} className="align-middle mb-1 me-3" />
              Rol: <strong>{user.role}</strong>
            </Nav.Item>
            <Nav.Item className="mb-2 ms-3">
              <div className="row align-items-center">
                <div className="col-auto">
                  <BoxSeam size={16} className="align-middle mb-1 me-3" />
                  Caja: <strong>{user.virtualcashpointname}</strong>
                </div>
                {isGerente && (
                  <div className="col">
                    <Form>
                      <Form.Group>
                        <Form.Select
                          className="form-select-sm"
                          value={idGlobalVirtualCashPoint}
                          onChange={(e) => {
                            handleChangeVirtualCashPoint(e.target.value);
                          }}
                        >
                          <option value="">--Cambiar--</option>
                          {virtualCashPoints.map((virtualCashPoint) => (
                            <option
                              key={virtualCashPoint.idglobalvirtualcashpoint}
                              value={virtualCashPoint.idglobalvirtualcashpoint}
                            >
                              {virtualCashPoint.name}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Form>
                  </div>
                )}
              </div>
            </Nav.Item>

            <Nav.Item className="d-grid">
              <Button
                className="mt-2"
                variant="outline-primary"
                onClick={handleLogout}
              >
                Cerrar Sesión
              </Button>
            </Nav.Item>
          </Nav>
        ) : (
          <div>No user data available</div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
