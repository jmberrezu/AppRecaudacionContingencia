import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Table, Button, Modal, Form, Alert } from "react-bootstrap";
import { SendFill } from "react-bootstrap-icons";

function SendPrincipalService({ idcashpoint, office }) {
  const [token, setToken] = useState("");
  const [closedCash, setClosedCash] = useState([]);
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedCash, setSelectedCash] = useState(null);
  // Estado para mostrar alertas
  const [alertInfo, setAlertInfo] = useState(null);

  // Obtener el token del local storage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      axios
        .get("http://localhost:5000/api/supervisor/verify", {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
        .then((response) => {
          // Verificar el rol de supervisor
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
          navigate("/");
        });
    } else {
      // Si no hay token, redirigir al inicio de sesión
      navigate("/");
    }
  }, [navigate]);

  // Obtener la lista de cajas cerradas
  useEffect(() => {
    if (token) {
      fetchClosedCash();
    }
  }, [token, idcashpoint]);

  // Función para obtener la lista cajas cerradas
  const fetchClosedCash = useCallback(async () => {
    if (idcashpoint) {
      try {
        const response = await fetch(
          `http://localhost:5000/api/supervisor/closedcash/${idcashpoint}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const closedCashData = await response.json();
          setClosedCash(closedCashData);
        }
      } catch (error) {
        console.error(error);
      }
    }
  });

  const handleModalClose = () => {
    setShowModal(false);
    setAlertInfo(null);
    setUsername("");
    setPassword("");
    setSelectedCash(null); // Limpia la caja seleccionada al cerrar el modal
  };

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "numeric", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const enviar = (cash) => {
    axios
      .post(
        "http://localhost:5000/api/supervisor/sendprincipal",
        {
          idcashpoint: cash.idcashpoint,
          cash: cash,
          username,
          password,
          office,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then((response) => {
        if (response.status === 200) {
          setAlertInfo({
            variant: "success",
            message: "Caja enviada correctamente",
          });
          handleModalClose();
          fetchClosedCash();
        }
      })
      .catch((error) => {
        if (error.response.status === 401) {
          setAlertInfo({
            variant: "danger",
            message: "Usuario o contraseña incorrectos",
          });
        } else if (
          error.response.data.message === "username and password required"
        ) {
          setAlertInfo({
            variant: "danger",
            message: "Ingrese usuario y contraseña",
          });
        } else {
          setAlertInfo({
            variant: "danger",
            message:
              error.response.data.message +
              ". Contactarse con el administrador",
          });
        }
      });
  };

  const handleEnviarClick = (cash) => {
    setSelectedCash(cash);
    setShowModal(true);
  };

  return (
    <div>
      <div style={{ height: "81vh", overflowY: "auto" }}>
        <h3>Lista de Cajas Cerradas:</h3>
        <Table striped bordered responsive>
          <thead>
            <tr>
              <th>Grupo</th>
              <th>Fecha</th>
              <th>Monto Cerrado</th>
              <th>Caja</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {closedCash.map((cash) => (
              <tr key={cash.cashpointpaymentgroupreferenceid}>
                <td>{cash.cashpointpaymentgroupreferenceid}</td>
                <td>{formatDate(cash.valuedate)}</td>
                <td
                  className={
                    parseFloat(cash.closingdoccumentamount) !==
                    parseFloat(cash.realclosingdoccumentamount)
                      ? "text-danger"
                      : "text-success"
                  }
                >
                  {"$" + cash.closingdoccumentamount}
                  {parseFloat(cash.closingdoccumentamount) !==
                    parseFloat(cash.realclosingdoccumentamount) &&
                    ` (Existe diferencia: ${
                      (parseFloat(cash.closingdoccumentamount) -
                        parseFloat(cash.realclosingdoccumentamount) >
                      0
                        ? "+"
                        : "") +
                      (
                        parseFloat(cash.closingdoccumentamount) -
                        parseFloat(cash.realclosingdoccumentamount)
                      ).toFixed(2)
                    }$ )`}
                </td>
                <td>{cash.virtualcashpointname}</td>
                <td>
                  <Button
                    variant="warning"
                    onClick={() => handleEnviarClick(cash)}
                    disabled={
                      parseFloat(cash.closingdoccumentamount) !==
                      parseFloat(cash.realclosingdoccumentamount)
                    }
                  >
                    <SendFill size={16} className="align-middle mb-1 me-2" />
                    Enviar Servicio Principal
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <Modal show={showModal} onHide={handleModalClose}>
        <Modal.Header closeButton>
          <Modal.Title>Ingrese Usuario y Contraseña SAP</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {alertInfo && (
            <Alert variant={alertInfo.variant}>{alertInfo.message}</Alert>
          )}
          <Form>
            <Form.Group controlId="username">
              <Form.Label>Usuario</Form.Label>
              <Form.Control
                type="text"
                placeholder="Ingrese su usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Form.Group>

            <Form.Group controlId="password">
              <Form.Label>Contraseña</Form.Label>
              <Form.Control
                type="password"
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleModalClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => enviar(selectedCash)}>
            Enviar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default SendPrincipalService;
