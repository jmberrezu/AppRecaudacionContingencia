import React, { useState, useEffect } from "react";
import { Container, Button, Navbar, Nav } from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Recaudation() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      // Si no hay token, redirige al inicio de sesión
      navigate("/");
    } else {
      // Si hay token, verifica su validez
      axios
        .get("/api/login/protected", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          setToken(token);
          setUser(response.data.user); // Guardar los datos del usuario
        })
        .catch((error) => {
          console.error(error);
          navigate("/");
        });
    }
  }, [navigate]);

  const handleLogout = () => {
    // Limpiar el token y redirigir al inicio de sesión
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <Container>
      <Navbar bg="light" expand="lg">
        <Navbar.Brand>Página de Recaudación</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mr-auto">
            {user && (
              <Nav.Item>
                <Nav.Link disabled>Bienvenido, {user.username}!</Nav.Link>
              </Nav.Item>
            )}
            {user && (
              <Nav.Item>
                <Button variant="primary" onClick={handleLogout}>
                  Cerrar Sesión
                </Button>
              </Nav.Item>
            )}
          </Nav>
        </Navbar.Collapse>
      </Navbar>
      <h1>Página de Recaudación</h1>
    </Container>
  );
}

export default Recaudation;
