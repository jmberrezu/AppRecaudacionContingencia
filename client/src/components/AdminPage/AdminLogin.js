import React, { useState } from "react";
import { Container, Alert, Form, InputGroup, Button } from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { PersonGear } from "react-bootstrap-icons";
import sparkPayLogo from "../../images/logoCh.svg"; // Ruta a tu imagen

function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [alertInfo, setAlertInfo] = useState(null);

  const handleLogin = async () => {
    try {
      const response = await axios.post("/api/admin", {
        username,
        password,
      });
      const token = response.data.token;

      // Guardar el token en localStorage
      localStorage.setItem("token", token);

      setAlertInfo({
        variant: "success",
        message: "Login correcto.",
      });

      navigate("http://localhost:5000/supervisorcrud"); // Redirigir a la página de SupervisorCrud
    } catch (error) {
      // Si el error es por usuario o contraseña incorrectos
      if (error.response.status === 400) {
        setAlertInfo({
          variant: "danger",
          message: "Ingrese un usuario y contraseña.",
        });
      } else if (error.response.status === 401) {
        setAlertInfo({
          variant: "danger",
          message: "Usuario o Contraseña incorrecta.",
        });
      } else {
        setAlertInfo({
          variant: "danger",
          message: "Error.",
        });
        console.log(error);
      }
    }
  };

  return (
    <Container
      style={{
        width: "900px",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div className="p-4 card shadow">
        <Container style={{ maxWidth: "200px" }} className="g-0">
          <img
            src={sparkPayLogo}
            alt="SparkPay Logo"
            className="img-fluid rounded mb-4 p-3 shadow"
          />
        </Container>
        <h1 className="text-center mb-2">
          <strong>Spark-Pay</strong>
        </h1>
        <h3
          className="text-center mb-2 text-secondary"
          style={{ minWidth: "350px" }}
        >
          - App de Recaudación -
        </h3>
        <hr />
        <h2 className="text-center mt-2 mb-3">Inicio de Sesión</h2>
        <h2 className="text-center mb-4">
          <strong className="text-warning">
            <PersonGear className="align-middle mb-1 me-1"> </PersonGear> Admin
          </strong>
        </h2>

        {alertInfo && (
          <Alert variant={alertInfo.variant}>{alertInfo.message}</Alert>
        )}

        <InputGroup className="mb-3">
          <Form.Control
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </InputGroup>
        <InputGroup className="mb-3">
          <Form.Control
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </InputGroup>

        <div className="d-grid">
          <Button variant="warning" onClick={handleLogin}>
            Iniciar Sesión
          </Button>
        </div>
      </div>
    </Container>
  );
}

export default AdminLogin;
