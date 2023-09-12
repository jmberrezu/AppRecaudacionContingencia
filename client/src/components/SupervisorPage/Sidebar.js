import React from "react";
import { Nav, Button, Col, Row } from "react-bootstrap";
import { Link } from "react-router-dom";
import {
  PersonFill,
  SendFill,
  PersonCircle,
  BoxSeam,
  HourglassBottom,
} from "react-bootstrap-icons";
import sparkPayLogo from "../../images/logoM.svg";

function Sidebar({ user, handleLogout, setActiveComponent, activeComponent }) {
  return (
    <div
      className="d-flex flex-column flex-shrink-0 p-3 bg-body-tertiary"
      style={{ width: "281px", height: "100vh" }}
    >
      <Row>
        <Col xs={3}>
          <img
            src={sparkPayLogo}
            alt="SparkPay Logo"
            className="img-fluid  mt-1 "
          />
        </Col>
        <Col xs={9}>
          <span className="fs-3 ">Spark-Pay</span>
        </Col>
      </Row>
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
            <PersonFill size={16} className="align-middle mb-1 me-2" />{" "}
            Administrar Usuarios
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
            <BoxSeam size={16} className="align-middle mb-1 me-2" /> Administrar
            Cajas Virtuales
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
        <hr />
        <strong className="mb-2">Historial</strong>
        <Nav.Item>
          <Link
            to="#"
            className={`nav-link ${
              activeComponent === "historialenvios" ? "active" : "text-black"
            } `}
            onClick={() => setActiveComponent("historialenvios")}
          >
            <HourglassBottom size={16} className="align-middle mb-1 me-2" />{" "}
            Historial de Envíos
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
