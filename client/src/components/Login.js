import React, { useState } from "react";
import { Container, Alert } from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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

      navigate("/recaudation"); // Redirigir a la página de UserCrud
    } catch (error) {
      setAlertInfo({
        variant: "danger",
        message: error.response.data.message,
      });
    }
  };

  return (
    <Container>
      <h1 className="text-center my-3">Login</h1>
      {alertInfo && (
        <Alert variant={alertInfo.variant}>{alertInfo.message}</Alert>
      )}
      <div className="input-group my-3">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Usuario"
          className="form-control"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          className="form-control"
        />
        <button onClick={handleLogin} className="btn btn-primary">
          Iniciar Sesión
        </button>
      </div>
    </Container>
  );
}

export default Login;
