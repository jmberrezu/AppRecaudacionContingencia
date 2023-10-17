import React, { useState, useEffect } from "react";
import axios from "axios";
import UserCrud from "./UserCrud";
import VirtualCashPointCrud from "./VirtualCashPointCrud";
import { Container } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import SendPrincipalService from "./SendPrincipalService";
import Sidebar from "./Sidebar";
import SentHistory from "./SentHistory";
import { PersonGear } from "react-bootstrap-icons";
import PrintMessage from "./PrintMessage";
import ExportClients from "./ExportClients";

function SupervisorView() {
  // Para el token y la navegación
  const navigate = useNavigate();
  // Para el componente activo
  const [activeComponent, setActiveComponent] = useState("crudusuarios"); // Inicialmente muestra el componente de CRUD de usuarios

  // Para obtener el usuario
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      axios
        .get("http://localhost:5000/api/login/verify", {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })
        .then((response) => {
          // Verificar el rol
          if (response.data.role !== "supervisor") {
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
        <h1>
          <PersonGear className="align-middle mb-1 me-1"> </PersonGear> Página
          de Supervisor
        </h1>
        <hr />
        {activeComponent === "crudusuarios" && user && (
          <UserCrud
            idcashpoint={user.idcashpoint}
            societydivision={user.societydivision}
          />
        )}
        {activeComponent === "crudcajasvirtuales" && (
          <VirtualCashPointCrud idcashpoint={user?.idcashpoint} />
        )}
        {activeComponent === "envio" && (
          <SendPrincipalService
            idcashpoint={user?.idcashpoint}
            office={user?.office}
          />
        )}
        {activeComponent === "historialenvios" && (
          <SentHistory idcashpoint={user?.idcashpoint} />
        )}
        {activeComponent === "impresion" && (
          <PrintMessage idcashpoint={user?.idcashpoint} />
        )}
        {activeComponent === "exportarclientes" && (
          <ExportClients idcashpoint={user?.societydivision} />
        )}
      </Container>
    </div>
  );
}

export default SupervisorView;
