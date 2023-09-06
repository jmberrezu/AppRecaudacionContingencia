import React, { useState, useEffect } from "react";
import axios from "axios";
import { Container, Table, Button, Modal, Form, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

function VirtualCashPointCrud(idcashpoint) {
  // Para el token y la navegación
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  // Estado para almacenar los cajeros virtuales
  const [virtualCashPoints, setVirtualCashPoints] = useState([]);
  // Estados para controlar los modales
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  // Estados para controlar los campos del formulario
  const [name, setName] = useState("");
  // Estado para controlar los mensajes de alerta
  const [alertInfo, setAlertInfo] = useState(null);
  // Estado para controlar el cajero virtual que se está editando
  const [editingVirtualCashPoint, setEditingVirtualCashPoint] = useState(null);

  // Obtener el token del local storage
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

  // Cargo los cajeros virtuales al cargar el componente
  useEffect(() => {
    if (token) {
      // Verifica si idcashpoint existe antes de llamar a fetchVirtualCashPoints
      fetchVirtualCashPoints();
    }
  }, [token, idcashpoint]);

  // Limiar el formulario y alerta cuando se cierra el modal
  useEffect(() => {
    if (!showModal) {
      setName("");
      setAlertInfo(null);
    }
  }, [showModal]);

  // Limiar el formulario y alerta cuando se cierra el modal de edicion
  useEffect(() => {
    if (!showEditModal) {
      setName("");
      setAlertInfo(null);
    }
  }, [showEditModal]);

  // Función para obtener la lista de cajeros virtuales
  const fetchVirtualCashPoints = async () => {
    if (idcashpoint.idcashpoint) {
      try {
        const response = await axios.get(
          `/api/virtualCashPoints/${idcashpoint.idcashpoint}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setVirtualCashPoints(response.data);
      } catch (error) {
        console.error(error);
      }
    }
  };

  // Función para crear un nuevo cajero virtual
  const createVirtualCashPoint = async () => {
    try {
      if (name) {
        await axios.post(
          "/api/virtualCashPoints",
          {
            name,
            idCashPoint: idcashpoint.idcashpoint,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setName("");
        setAlertInfo({
          variant: "success",
          message: "Cajero virtual agregado exitosamente.",
        });
        fetchVirtualCashPoints();
      } else {
        setAlertInfo({
          variant: "danger",
          message: "Por favor, complete todos los campos requeridos.",
        });
      }
    } catch (error) {
      if (error.response.message === "name must be 2 to 50 characters") {
        setAlertInfo({
          variant: "danger",
          message: "El nombre debe tener entre 2 y 50 caracteres.",
        });
      } else {
        setAlertInfo({
          variant: "danger",
          message: error.response.message,
        });
      }
    }
  };

  // Funcion para editar un cajero virtual
  const editVirtualCashPoint = (virtualCashPoint) => {
    setEditingVirtualCashPoint(virtualCashPoint);
    setName(virtualCashPoint.name);
    setShowEditModal(true);
  };

  // Función para actualizar un cajero virtual
  const updateVirtualCashPoint = async () => {
    try {
      let updatedVirtualCashPoint = {
        ...editingVirtualCashPoint,
        name,
        idCashPoint: idcashpoint.idcashpoint,
      };

      await axios.put(
        `/api/virtualCashPoints/${editingVirtualCashPoint.idglobalvirtualcashpoint}`,
        updatedVirtualCashPoint,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setEditingVirtualCashPoint(null);
      setShowEditModal(false);
      setName("");
      setAlertInfo({
        variant: "success",
        message: "Cajero virtual actualizado exitosamente.",
      });
      fetchVirtualCashPoints();
    } catch (error) {
      console.error(error);
      setAlertInfo({
        variant: "danger",
        message: error.response.message,
      });
    }
  };

  // Función para eliminar un cajero virtual
  const deleteVirtualCashPoint = async (id) => {
    try {
      await axios.delete(`/api/virtualCashPoints/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      fetchVirtualCashPoints();
      setShowEditModal(false);
    } catch (error) {
      // Si el error es 400 es que el cajero virtual puede ser eliminado ya que tiene pagos
      if (
        error.response.status === 400 &&
        error.response.data.message ===
          "No se puede eliminar este cajero virtual porque tiene usuarios asignados"
      ) {
        setAlertInfo({
          variant: "danger",
          message:
            "No se puede eliminar este cajero virtual porque tiene usuarios asignados",
        });
      } else {
        setAlertInfo({
          variant: "danger",
          message: error.response.message,
        });
      }
    }
  };

  return (
    <Container>
      <h1>CRUD de Cajeros Virtuales</h1>
      <Button variant="primary" onClick={() => setShowModal(true)}>
        Agregar Cajero Virtual
      </Button>
      <div style={{ height: "70vh", overflowY: "auto" }}>
        <Table striped bordered hover className="mt-3">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {virtualCashPoints.map((virtualCashPoint) => (
              <tr key={virtualCashPoint.idglobalvirtualcashpoint}>
                <td>{virtualCashPoint.idvirtualcashpoint}</td>
                <td>{virtualCashPoint.name}</td>
                <td>
                  <Button
                    variant="success"
                    onClick={() => editVirtualCashPoint(virtualCashPoint)}
                  >
                    Editar
                  </Button>{" "}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Agregar Cajero Virtual</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {alertInfo && (
            <Alert variant={alertInfo.variant}>{alertInfo.message}</Alert>
          )}
          <Form>
            <Form.Group>
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cerrar
          </Button>
          <Button variant="primary" onClick={createVirtualCashPoint}>
            Agregar
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Editar Cajero Virtual</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {alertInfo && (
            <Alert variant={alertInfo.variant}>{alertInfo.message}</Alert>
          )}
          <Form>
            <Form.Group>
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cerrar
          </Button>
          <Button
            variant="danger"
            onClick={() =>
              deleteVirtualCashPoint(
                editingVirtualCashPoint.idglobalvirtualcashpoint
              )
            }
          >
            Eliminar
          </Button>
          <Button variant="primary" onClick={updateVirtualCashPoint}>
            Actualizar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default VirtualCashPointCrud;
