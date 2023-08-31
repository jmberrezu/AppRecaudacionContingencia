import React, { useState, useEffect } from "react";
import axios from "axios";
import UserCrud from "./UserCrud";
import VirtualCashPointCrud from "./VirtualCashPointCrud";
import { Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import SendPrincipalService from "./SendPrincipalService";
import Sidebar from "./Sidebar";

function SupervisorView() {
  // Para el token y la navegación
  const navigate = useNavigate();
  // Para el componente activo
  const [activeComponent, setActiveComponent] = useState("crudusuarios"); // Inicialmente muestra el componente de CRUD de usuarios

  // Para obtener el usuario
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      axios
        .get("/api/supervisor/verify", {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })
        .then((response) => {
          // Verificar el rol
          if (response.data.role !== "supervisor") {
            navigate("/supervisor");
          } else {
            // Guardar el usuario
            setUser(response.data);
          }
        })
        .catch((error) => {
          // Si el token no es válido, redirigir al inicio de sesión
          console.error("Error verifying token: ", error);
          navigate("/supervisor");
        });
    } else {
      // Si no hay token, redirigir al inicio de sesión
      navigate("/supervisor");
    }
  }, [navigate, user]);

  // Cerrar sesión
  const handleLogout = () => {
    // Limpiar el token y redirigir al inicio de sesión
    localStorage.removeItem("token");
    navigate("/supervisor");
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
        <h1>Página de Supervisor</h1>
        <hr />
        {activeComponent === "crudusuarios" && (
          <UserCrud idcashpoint={user?.idcashpoint} />
        )}
        {activeComponent === "crudcajasvirtuales" && (
          <VirtualCashPointCrud idcashpoint={user?.idcashpoint} />
        )}
        {activeComponent === "envio" && (
          <SendPrincipalService idcashpoint={user?.idcashpoint} />
        )}
      </Container>
    </div>
  );
}

export default SupervisorView;
