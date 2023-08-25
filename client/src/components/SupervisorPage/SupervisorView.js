import React, { useState, useEffect } from "react";
import axios from "axios";
import UserCrud from "./UserCrud";
import VirtualCashPointCrud from "./VirtualCashPointCrud";
import { Container, Nav, Navbar, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { PersonCircle, BoxSeam } from "react-bootstrap-icons";

function SupervisorView() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [userLoaded, setUserLoaded] = useState(false); // Nuevo estado

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      // If no token, redirect to login
      navigate("/");
    } else {
      // If token exists, verify its validity
      axios
        .get("/api/supervisor/protected", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          setToken(token);
          setUser(response.data.user); // Save user data
          setUserLoaded(true); // Indicar que el usuario se ha cargado
        })
        .catch((error) => {
          console.error(error);
          navigate("/supervisor");
        });
    }
  }, [navigate, setToken]); // Include setToken as a dependency

  const handleLogout = () => {
    // Limpiar el token y redirigir al inicio de sesión
    localStorage.removeItem("token");
    navigate("/supervisor");
  };

  if (!userLoaded) {
    // Mostrar algún indicador de carga mientras se obtienen los datos del usuario
    return <div>Cargando...</div>;
  }

  return (
    <div>
      {user && ( // Renderizar solo si el usuario está disponible
        <Navbar className="bg-body-tertiary stick" expand="lg" sticky="top">
          <Container>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Nav>
              <Navbar.Brand>App Recaudación</Navbar.Brand>
            </Nav>
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto"></Nav>
              <Nav>
                <Nav.Item className="pe-4 pt-2">
                  <PersonCircle size={16} className="align-middle mb-1 me-2" />
                  Supervisor: <strong>{user.username}</strong>
                </Nav.Item>
                <Nav.Item className="pe-4 pt-2">
                  <BoxSeam size={16} className="align-middle mb-1 me-2" />
                  Caja: <strong>{user.idcashpoint}</strong>
                </Nav.Item>
                {user && (
                  <Nav.Item className="">
                    <Button variant="outline-primary" onClick={handleLogout}>
                      Cerrar Sesión
                    </Button>
                  </Nav.Item>
                )}
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>
      )}
      {user && (
        <Container>
          <UserCrud idcashpoint={user && user.idcashpoint} />
          <hr className="my-4" />
          <VirtualCashPointCrud idcashpoint={user && user.idcashpoint} />
        </Container>
      )}
    </div>
  );
}

export default SupervisorView;
