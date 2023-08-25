import React, { useState, useEffect } from "react";
import axios from "axios";
import UserCrud from "./UserCrud";
import VirtualCashPointCrud from "./VirtualCashPointCrud";
import { Container, Row, Col, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

function SupervisorView() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");

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
        })
        .catch((error) => {
          console.error(error);
          navigate("/");
        });
    }
  }, [navigate, setToken]); // Include setToken as a dependency

  const handleLogout = () => {
    // Limpiar el token y redirigir al inicio de sesión
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <Container>
      <Container className="my-3 ">
        <Row className="justify-content-between">
          <Col xs={8} className="g-0">
            <h3 className="text-center my-3">
              {user &&
                `Bienvenido, ${user.username}, a la caja ${user.idcashpoint}`}
            </h3>
          </Col>
          <Col xs={4} className="text-end">
            <Button
              className="mt-2"
              variant="outline-primary"
              onClick={handleLogout}
            >
              Cerrar Sesión
            </Button>
          </Col>
        </Row>
      </Container>
      <hr />
      <UserCrud idcashpoint={user && user.idcashpoint} />
      <VirtualCashPointCrud idcashpoint={user && user.idcashpoint} />
    </Container>
  );
}

export default SupervisorView;
