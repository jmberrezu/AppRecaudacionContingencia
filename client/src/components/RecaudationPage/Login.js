import React, { useState } from "react";
import { Container, Alert, InputGroup, Form, Button } from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Person } from "react-bootstrap-icons";

function Login() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [alertInfo, setAlertInfo] = useState(null);

  const handleLogin = async () => {
    try {
      const response = await axios.post("/api/login", {
        username,
        password,
      });
      const token = response.data.token;
      setToken(token);

      // Guardar el token en localStorage
      localStorage.setItem("token", token);

      setAlertInfo({
        variant: "success",
        message: "Login correcto.",
      });

      navigate("/recaudation", { state: { token } }); // Redirigir a la página de UserCrud
    } catch (error) {
      setAlertInfo({
        variant: "danger",
        message: error.response.data.message,
      });
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
        <h1 className="text-center mb-2">App de Recaudación</h1>
        <hr />
        <h2 className="text-center mt-2 mb-3">Inicio de Sesión</h2>
        <h2 className="text-center mb-4">
          <strong className="text-primary">
            <Person className="align-middle mb-1 me-1"> </Person> Usuario
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
          <Button variant="primary" onClick={handleLogin}>
            Iniciar Sesión
          </Button>
        </div>
      </div>
    </Container>
  );
}

export default Login;
