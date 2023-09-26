import React, { useState, useEffect } from "react";
import { Container } from "react-bootstrap";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Payment from "./Payment";
import CashClose from "./CashClose";
import ReverseCashClose from "./ReverseCashClose";
import ReversePayment from "./ReversePayment";
import Sidebar from "./Sidebar";
import PaymentHistory from "./PaymentHistory";
import CashCloseHistory from "./CashCloseHistory";

function Recaudation() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeComponent, setActiveComponent] = useState("payment"); // Inicialmente muestra el componente Payment
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [token, setToken] = useState("");

  // Para mostrar la fecha y hora actual
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Verificar el token
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      axios
        .get("http://localhost:5000/api/login/verify", {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
        .then((response) => {
          // Verificar el rol ya sea cajero o gerente
          if (
            response.data.role !== "cajero" &&
            response.data.role !== "gerente"
          ) {
            navigate("/");
          } else {
            // Guardar el usuario
            setUser(response.data);
            // Guardar el token
            setToken(storedToken);
          }
        })
        .catch((error) => {
          // Si el token no es válido, redirigir al inicio de sesión
          console.error("Error verifying token: ", error);
          navigate("/");
        });
    } else {
      // Si no hay token, redirigir al inicio de sesión
      navigate("/");
    }
  }, [navigate]);

  // Cerrar sesión
  const handleLogout = async () => {
    // Limpiar el token y redirigir al inicio de sesión
    localStorage.removeItem("token");
    try {
      await axios.delete(`http://localhost:5000/api/login/logout`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error(error);
    }
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
        {activeComponent === "payment" && <Payment user={user} />}
        {activeComponent === "cashClose" && <CashClose user={user} />}
        {activeComponent === "reversePayment" && <ReversePayment user={user} />}
        {activeComponent === "reverseCashClose" && (
          <ReverseCashClose user={user} />
        )}
        {activeComponent === "history" && <PaymentHistory user={user} />}
        {activeComponent === "history-closed" && (
          <CashCloseHistory user={user} />
        )}
      </Container>
    </div>
  );
}

export default Recaudation;
