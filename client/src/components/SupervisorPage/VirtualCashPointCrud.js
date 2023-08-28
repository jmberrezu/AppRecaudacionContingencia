import React, { useState, useEffect } from "react";
import axios from "axios";
import { Container, Table, Button, Modal, Form, Alert } from "react-bootstrap";

function VirtualCashPointCrud(idcashpoint) {
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

  // Cargo los cajeros virtuales al cargar el componente
  useEffect(() => {
    if (idcashpoint) {
      // Verifica si idcashpoint existe antes de llamar a fetchVirtualCashPoints
      fetchVirtualCashPoints();
    }
  }, [idcashpoint]);

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
    try {
      const response = await axios.get(
        `/api/virtualCashPoints/${idcashpoint.idcashpoint}`
      );
      setVirtualCashPoints(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  // Función para crear un nuevo cajero virtual
  const createVirtualCashPoint = async () => {
    try {
      if (name) {
        await axios.post("/api/virtualCashPoints", {
          name,
          idCashPoint: idcashpoint.idcashpoint,
        });
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
      console.error(error);
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
      if (editingVirtualCashPoint) {
        const updatedVirtualCashPoint = {
          ...editingVirtualCashPoint,
          name,
          idCashPoint: idcashpoint.idcashpoint,
        };
        await axios.put(
          `/api/virtualCashPoints/${editingVirtualCashPoint.idglobalvirtualcashpoint}`,
          updatedVirtualCashPoint
        );

        setEditingVirtualCashPoint(null);
        setShowEditModal(false);
        setName("");
        setAlertInfo({
          variant: "success",
          message: "Cajero virtual actualizado exitosamente.",
        });
        fetchVirtualCashPoints();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Función para eliminar un cajero virtual
  const deleteVirtualCashPoint = async (id) => {
    try {
      console.log("q pts");
      const response = await axios.delete(`/api/virtualCashPoints/${id}`);

      if (response.data.message === "Cajero virtual eliminado exitosamente") {
        setAlertInfo({
          variant: "success",
          message: "Cajero virtual eliminado exitosamente.",
        });
        fetchVirtualCashPoints();
        setShowEditModal(false);
      } else {
        setAlertInfo({
          variant: "danger",
          message: response.data.message,
        });
      }
    } catch (error) {
      console.error(error);
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
                <td>{virtualCashPoint.idglobalvirtualcashpoint}</td>
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
