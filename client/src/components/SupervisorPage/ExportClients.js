import React from "react";
import { Button } from "react-bootstrap";
import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function ExportClients({ societydivision }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Obtener el token del local storage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      axios
        .get("http://localhost:5000/api/login/verify", {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
        .then((response) => {
          // Verificar el rol de supervisor
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

  const handleExportClick = async () => {
    try {
      // Realizar una solicitud GET para descargar el archivo CSV
      const response = await axios.get(
        `http://localhost:5000/api/supervisor/exportclients/${user.societydivision}`,
        {
          responseType: "blob", // Solicitar una respuesta en formato binario
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Crear una URL para el archivo descargado
      const url = window.URL.createObjectURL(new Blob([response.data]));

      // Crear un enlace para descargar el archivo
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Clientes-${new Date()
          .toLocaleString()
          .replace(/[/:]/g, "-")
          .replace(/,/g, "")
          .replace(/ /g, "-")}.csv`
      );

      // Hacer clic en el enlace para iniciar la descarga
      link.click();

      // Liberar la URL del objeto creado
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al exportar Clientes:", error);
    }
  };

  return (
    <div>
      <h2>Exportar Clientes</h2>
      <hr />
      <Button
        onClick={() => {
          handleExportClick();
        }}
        variant="outline-success"
      >
        Exportar Clientes
      </Button>
    </div>
  );
}

export default ExportClients;
