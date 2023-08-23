import React, { useState, useEffect } from "react";
import { Container } from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Payment from "./Payment";
import CashClose from "./CashClose";
import ReverseCashClose from "./ReverseCashClose";
import ReversePayment from "./ReversePayment";
import Sidebar from "./Sidebar";

function Recaudation() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [activeComponent, setActiveComponent] = useState("payment"); // Inicialmente muestra el componente Payment

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
    <div className="d-flex">
      <Sidebar
        user={user}
        handleLogout={handleLogout}
        setActiveComponent={setActiveComponent}
        activeComponent={activeComponent}
      />
      <Container fluid className="my-3">
        <h1>Página de Recaudación</h1>
        <hr />
        {activeComponent === "payment" && <Payment />}
        {activeComponent === "cashClose" && <CashClose />}
        {activeComponent === "reversePayment" && <ReversePayment />}
        {activeComponent === "reverseCashClose" && <ReverseCashClose />}
      </Container>
    </div>
  );
}

export default Recaudation;
