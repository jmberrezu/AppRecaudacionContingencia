import React, { useState, useEffect } from "react";
import axios from "axios";
import UserCrud from "./UserCrud";
import VirtualCashPointCrud from "./VirtualCashPointCrud";
import { Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import SendPrincipalService from "./SendPrincipalService";
import Sidebar from "./Sidebar";

function SupervisorView() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [userLoaded, setUserLoaded] = useState(false); // Nuevo estado
  const [activeComponent, setActiveComponent] = useState("crudusuarios"); // Inicialmente muestra el componente Payment

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
    <div className="d-flex">
      <Sidebar
        user={user}
        handleLogout={handleLogout}
        setActiveComponent={setActiveComponent}
        activeComponent={activeComponent}
      />

      <Container fluid className="my-3">
        <h1>Página de Supervisor</h1>
        <hr />
        {activeComponent === "crudusuarios" && (
          <UserCrud idcashpoint={user && user.idcashpoint} />
        )}
        {activeComponent === "crudcajasvirtuales" && (
          <VirtualCashPointCrud idcashpoint={user && user.idcashpoint} />
        )}
        {activeComponent === "envio" && (
          <SendPrincipalService idcashpoint={user && user.idcashpoint} />
        )}
      </Container>
    </div>
  );
}

export default SupervisorView;
