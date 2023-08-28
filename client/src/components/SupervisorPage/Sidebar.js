import React from "react";
import { Nav, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import {
  PersonFill,
  SendFill,
  PersonCircle,
  BoxSeam,
} from "react-bootstrap-icons";

function Sidebar({ user, handleLogout, setActiveComponent, activeComponent }) {
  console.log("Sidebar: ", setActiveComponent, activeComponent);
  return (
    <div
      className="d-flex flex-column flex-shrink-0 p-3 bg-body-tertiary"
      style={{ width: "280px", height: "100vh" }}
    >
      <span className="fs-4">App Recaudación</span>
      <hr />
      <Nav className="nav nav-pills flex-column mb-auto">
        <strong className="mb-2">Administración</strong>
        <Nav.Item>
          <Link
            to="#"
            className={`nav-link ${
              activeComponent === "crudusuarios" ? "active" : "text-black"
            }`}
            onClick={() => setActiveComponent("crudusuarios")}
          >
            <PersonFill size={16} className="align-middle mb-1 me-2" /> Crud
            Usuarios
          </Link>
        </Nav.Item>

        <Nav.Item>
          <Link
            to="#"
            className={`nav-link ${
              activeComponent === "crudcajasvirtuales" ? "active" : "text-black"
            } `}
            onClick={() => setActiveComponent("crudcajasvirtuales")}
          >
            <BoxSeam size={16} className="align-middle mb-1 me-2" /> Crud Cajas
            Virtuales
          </Link>
        </Nav.Item>
        <hr />
        <strong className="mb-2">Servicio</strong>
        <Nav.Item>
          <Link
            to="#"
            className={`nav-link ${
              activeComponent === "envio" ? "active" : "text-black"
            } `}
            onClick={() => setActiveComponent("envio")}
          >
            <SendFill size={16} className="align-middle mb-1 me-2" /> Enviar al
            Servicio Principal
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
              <BoxSeam size={16} className="align-middle mb-1 me-3" />
              Caja: <strong>{user.idcashpoint}</strong>
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
