import React, { useState, useEffect } from "react";
import axios from "axios";
import { Container, Table, Button, Modal, Form, Alert } from "react-bootstrap";

function UserCrud() {
  // Estado para almacenar los usuarios
  const [users, setUsers] = useState([]);
  // Estados para controlar la visibilidad de los modales
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  // Estados para almacenar los datos del formulario
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [idCashPoint, setIdCashPoint] = useState("");
  const [idVirtualCashPoint, setIdVirtualCashPoint] = useState("");
  // Estado para almacenar datos de cajas virtuales
  const [virtualCashPoints, setVirtualCashPoints] = useState([]);
  // Estado para mostrar alertas
  const [alertInfo, setAlertInfo] = useState(null);
  // Estado para el usuario en edición
  const [editingUser, setEditingUser] = useState(null);

  // Cargar datos iniciales
  useEffect(() => {
    fetchUsers();
    fetchVirtualCashPoints();
  }, []);

  // Limpiar formulario y alerta cuando se cierra el modal
  useEffect(() => {
    if (!showModal) {
      setUsername("");
      setPassword("");
      setRole("");
      setIdCashPoint("");
      setIdVirtualCashPoint("");
      setAlertInfo(null);
    }
  }, [showModal]);

  // Función para obtener la lista de usuarios
  const fetchUsers = async () => {
    try {
      const response = await axios.get("/api/users");
      setUsers(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  // Función para obtener la lista de cajas virtuales
  const fetchVirtualCashPoints = async () => {
    try {
      const response = await axios.get("/api/virtualcashpoints");
      setVirtualCashPoints(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  // Función para crear un usuario
  const createUser = async () => {
    try {
      if (username && password && role && idCashPoint && idVirtualCashPoint) {
        await axios.post("/api/users", {
          username,
          password,
          role,
          idCashPoint,
          idVirtualCashPoint,
        });
        setUsername("");
        setPassword("");
        setRole("");
        setIdCashPoint("");
        setIdVirtualCashPoint("");
        setAlertInfo({
          variant: "success",
          message: "Usuario agregado exitosamente.",
        });
        fetchUsers();
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

  // Función para editar un usuario
  const editUser = (user) => {
    setEditingUser(user);
    setUsername(user.username);
    setPassword(user.password);
    setRole(user.role);
    setIdCashPoint(user.idcashpoint);
    setIdVirtualCashPoint(user.idvirtualcashpoint);
    setShowEditModal(true);
  };

  // Función para actualizar un usuario
  const updateUser = async () => {
    try {
      if (editingUser) {
        const updatedUser = {
          ...editingUser,
          username,
          role,
          idCashPoint,
          idVirtualCashPoint,
        };
        console.log(editingUser.iduser, updatedUser);
        await axios.put(`/api/users/${editingUser.iduser}`, updatedUser);
        setEditingUser(null);
        setShowEditModal(false);
        setUsername("");
        setRole("");
        setIdCashPoint("");
        setIdVirtualCashPoint("");
        setAlertInfo({
          variant: "success",
          message: "Usuario actualizado exitosamente.",
        });
        fetchUsers();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Función para eliminar un usuario
  const deleteUser = async (id) => {
    try {
      await axios.delete(`/api/users/${id}`);
      fetchUsers();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Container>
      <h1>CRUD de Usuarios</h1>
      <Button variant="primary" onClick={() => setShowModal(true)}>
        Agregar Usuario
      </Button>
      <Table striped bordered hover className="mt-3">
        <thead>
          <tr>
            <th>ID</th>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Caja</th>
            <th>Caja Virtual</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.iduser}>
              <td>{user.iduser}</td>
              <td>{user.username}</td>
              <td>{user.role}</td>
              <td>{user.idcashpoint}</td>
              <td>{user.idvirtualcashpoint}</td>
              <td>
                <Button variant="success" onClick={() => editUser(user)}>
                  Editar
                </Button>{" "}
                <Button
                  variant="danger"
                  onClick={() => deleteUser(user.iduser)}
                >
                  Eliminar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Agregar Usuario</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {alertInfo && (
            <Alert variant={alertInfo.variant}>{alertInfo.message}</Alert>
          )}
          <Form>
            <Form.Group>
              <Form.Label>Usuario</Form.Label>
              <Form.Control
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Contraseña</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Rol</Form.Label>
              <Form.Select
                as="select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="">-- Seleccione un rol --</option>
                <option value="cajero">Cajero</option>
                <option value="gerente">Gerente</option>
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>ID de Caja</Form.Label>
              <Form.Control
                type="text"
                value={idCashPoint}
                onChange={(e) => setIdCashPoint(e.target.value)}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Caja Virtual</Form.Label>
              <Form.Select
                value={idVirtualCashPoint}
                onChange={(e) => setIdVirtualCashPoint(e.target.value)}
              >
                <option value="">-- Seleccione una opción --</option>
                {virtualCashPoints.map((virtualCashPoint) => (
                  <option
                    key={virtualCashPoint.idVirtualCashPoint}
                    value={virtualCashPoint.idVirtualCashPoint}
                  >
                    {virtualCashPoint.idvirtualcashpoint}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cerrar
          </Button>
          <Button variant="primary" onClick={createUser}>
            Agregar
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Editar Usuario</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {alertInfo && (
            <Alert variant={alertInfo.variant}>{alertInfo.message}</Alert>
          )}
          <Form>
            <Form.Group>
              <Form.Label>Usuario</Form.Label>
              <Form.Control
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Contraseña</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Rol</Form.Label>
              <Form.Select
                as="select"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="cajero">Cajero</option>
                <option value="gerente">Gerente</option>
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>ID de Caja</Form.Label>
              <Form.Control
                type="text"
                value={idCashPoint}
                onChange={(e) => setIdCashPoint(e.target.value)}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Caja Virtual</Form.Label>
              <Form.Select
                value={idVirtualCashPoint}
                onChange={(e) => setIdVirtualCashPoint(e.target.value)}
              >
                {virtualCashPoints.map((virtualCashPoint) => (
                  <option
                    key={virtualCashPoint.idVirtualCashPoint}
                    value={virtualCashPoint.idVirtualCashPoint}
                  >
                    {virtualCashPoint.idvirtualcashpoint}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => deleteUser(editingUser.idUser)}
          >
            Eliminar
          </Button>
          <Button variant="primary" onClick={updateUser}>
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default UserCrud;
