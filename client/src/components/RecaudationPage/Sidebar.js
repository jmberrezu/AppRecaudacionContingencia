import React from "react";
import { Nav, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import {
  CashStack,
  Folder2Open,
  PersonCircle,
  Tools,
  BoxSeam,
  ArrowCounterclockwise,
  ArrowLeftRight,
} from "react-bootstrap-icons";

function Sidebar({ user, handleLogout, setActiveComponent, activeComponent }) {
  const isGerente = user && user.role === "gerente";

  return (
    <div
      className="d-flex flex-column flex-shrink-0 p-3 bg-body-tertiary"
      style={{ width: "280px", height: "100vh" }}
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
            <Nav.Item className="mb-2  ms-3">
              <BoxSeam size={16} className="align-middle mb-1 me-3" />
              Caja: <strong>{user.virtualcashpointname}</strong>
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
