import React, { useState } from "react";
import { Container, Alert, InputGroup, Form, Button } from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Person } from "react-bootstrap-icons";
import sparkPayLogo from "../../images/logoCh.svg"; // Ruta a tu imagen

function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [alertInfo, setAlertInfo] = useState(null);

  const handleLogin = async () => {
    try {
      const response = await axios.post("http://localhost:5000/api/login", {
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

      // Si es un usuario, redirigir a la página de Recaudación
      if (response.data.userType === "user") navigate("/recaudation");
      // Si es un supervisor, redirigir a la página de Supervisor
      else if (response.data.userType === "supervisor")
        navigate("/supervisorview");
      // Si es un administrador, redirigir a la página de Administrador
      else if (response.data.userType === "admin") navigate("/adminview");
    } catch (error) {
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
      } else if (error.response.status === 403) {
        setAlertInfo({
          variant: "danger",
          message: "Cuenta bloqueada, contacte al supervisor.",
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
          <strong className="text-primary">
            -- <Person className="align-middle mb-1 me-1"> </Person> --
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
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleLogin();
              }
            }}
          />
        </InputGroup>

        <div className="d-grid">
          <Button variant="primary" onClick={handleLogin}>
            Iniciar Sesión
          </Button>
        </div>
      </div>
    </Container>
  );
}

export default Login;
