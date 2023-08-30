import React, { useState, useEffect } from "react";
import { Container, Col, Row } from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Payment from "./Payment";
import CashClose from "./CashClose";
import ReverseCashClose from "./ReverseCashClose";
import ReversePayment from "./ReversePayment";
import Sidebar from "./Sidebar";
import PaymentHistory from "./PaymentHistory";

function Recaudation() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [activeComponent, setActiveComponent] = useState("payment"); // Inicialmente muestra el componente Payment
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000); // Actualiza cada segundo

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      // If no token, redirect to login
      navigate("/");
    } else {
      // If token exists, verify its validity
      axios
        .get("/api/login/protected", {
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
    <div className="d-flex">
      <Sidebar
        user={user}
        handleLogout={handleLogout}
        setActiveComponent={setActiveComponent}
        activeComponent={activeComponent}
      />
      <Container fluid className="my-3">
        <Container className="d-flex flex-wrap align-items-center">
          <div className="me-auto d-flex align-items-center mb-2">
            <h1 className="text-sm">Página de Recaudación</h1>
          </div>
          <div className="h5 d-none d-xl-block d-flex align-items-center mb-2">
            <strong className="pe-2">Fecha: </strong>
            <span className="text-sm">
              {currentDateTime.toLocaleDateString()}
            </span>
          </div>
          <div className="h5 mx-4 d-none d-xl-block d-flex align-items-center mb-2">
            <strong>|</strong>
          </div>
          <div className="h5 d-none d-xl-block d-flex align-items-center mb-2">
            <strong className="pe-2">Hora: </strong>
            <span className="text-sm">
              {currentDateTime.toLocaleTimeString()}
            </span>
          </div>
        </Container>

        <hr />
        {activeComponent === "payment" && <Payment user={user} token={token} />}
        {activeComponent === "cashClose" && (
          <CashClose user={user} token={token} />
        )}
        {activeComponent === "reversePayment" && (
          <ReversePayment
            token={token}
            idcashpoint={user.idcashpoint}
            user={user}
          />
        )}
        {activeComponent === "reverseCashClose" && (
          <ReverseCashClose
            token={token}
            idcashpoint={user.idcashpoint}
            user={user}
          />
        )}
        {activeComponent === "history" && (
          <PaymentHistory
            token={token}
            idcashpoint={user.idcashpoint}
            user={user}
          />
        )}
      </Container>
    </div>
  );
}

export default Recaudation;
