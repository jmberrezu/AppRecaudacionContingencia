import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function PrintMessage({ idcashpoint }) {
  // Para guardar el mensaje a imprimir
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [charCount, setCharCount] = useState(0);

  const navigate = useNavigate();

  // Obtener el token del local storage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      axios
        .get("http://localhost:5000/api/supervisor/verify", {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        })
        .then((response) => {
          // Verificar el rol
          if (response.data.role !== "supervisor") {
            navigate("/supervisor");
          } else {
            // Guardar el token
            setToken(storedToken);
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
  }, [navigate]);

  // Funcion para obtener el mensaje del servidor
  const getMessage = useCallback(async () => {
    if (idcashpoint)
      try {
        const response = await fetch(
          `http://localhost:5000/api/supervisor/printmessage/${idcashpoint}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.ok) {
          const messageData = await response.json();
          setMessage(messageData);
        }
      } catch (error) {
        console.error(error);
      }
  }, [idcashpoint, token]);

  // Funcion para enviar el mensaje al servidor
  const sendMessage = useCallback(async () => {
    // Controlar que el mensaje no sea vacío o undefined
    if (!message) {
      alert("El mensaje no puede estar vacío");
      return;
    }

    if (idcashpoint) {
      try {
        const response = await fetch(
          `http://localhost:5000/api/supervisor/printmessage/${idcashpoint}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ message }),
          }
        );
        if (response.ok) {
          alert("Mensaje guardado correctamente");
          getMessage();
        }
      } catch (error) {
        console.error(error);
      }
    }
  }, [idcashpoint, message, token, getMessage]);

  // Obtener el mensaje del servidor
  useEffect(() => {
    if (token) {
      getMessage();
    }
  }, [getMessage, idcashpoint, token]);

  return (
    // Aqui se deja al usuario modificar un mensaje que aparezca en los tickets impresos con un boton de guardar y usando bootstrap
    <div className="d-flex justify-content-center">
      <div className="d-flex flex-column justify-content-center align-items-center">
        <h1 className="text-center mb-3">
          Mensaje a imprimir en el comprobante
        </h1>
        <textarea
          className="form-control"
          style={{ height: "150px" }}
          value={message}
          onChange={(e) => {
            const inputMessage = e.target.value;
            if (inputMessage.length <= 100) {
              setMessage(inputMessage);
              if (inputMessage === "") {
                // Solo actualiza charCount si el mensaje no está vacío
                setCharCount(0);
              } else {
                setCharCount(inputMessage.length); // Actualiza el contador de caracteres
              }
            } else {
              // Truncar el mensaje a 100 caracteres si es más largo
              setMessage(inputMessage.slice(0, 100));
              setCharCount(100); // Actualiza el contador de caracteres a 100
            }
          }}
          placeholder="Escriba el mensaje a imprimir en el comprobante de máximo 100 caracteres"
        />

        <div className="text-center mb-2">
          {charCount}/{100} caracteres
        </div>
        <button className="btn btn-outline-success mt-3" onClick={sendMessage}>
          Guardar
        </button>
      </div>
    </div>
  );
}

export default PrintMessage;
