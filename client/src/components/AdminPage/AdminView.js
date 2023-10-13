import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import SupervisorCrud from "./SupervisorCrud";
import CompanyCrud from "./CompanyCrud";
import { Container } from "react-bootstrap";
import { PersonGear } from "react-bootstrap-icons";

import axios from "axios";

function AdminView() {
  // Para obtener el usuario
  const [token, setToken] = useState("");
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeComponent, setActiveComponent] = useState("crudsupervisores"); // Inicialmente muestra el componente de CRUD de usuarios

  // Obtener el token del local storage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      axios
        .get("http://localhost:5000/api/login/verify", {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
        .then((response) => {
          // Verificar el rol de admin
          if (response.data.role !== "admin") {
            navigate("/");
          } else {
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
        <h1 className="text-warning">
          <PersonGear className="align-middle mb-1 me-1"> </PersonGear> Página
          de Administrador
        </h1>
        <hr />
        {activeComponent === "crudsupervisores" && <SupervisorCrud />}
        {activeComponent === "crudempresas" && <CompanyCrud />}
      </Container>
    </div>
  );
}

export default AdminView;
