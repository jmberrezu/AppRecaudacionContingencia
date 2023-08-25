import React, { useState, useEffect } from "react";
import axios from "axios";
import { Container, Table, Button, Modal, Form, Alert } from "react-bootstrap";
import bcrypt from "bcryptjs-react";

function UserCrud(idcashpoint) {
  // Estado para almacenar los usuarios
  const [users, setUsers] = useState([]);
  // Estados para controlar la visibilidad de los modales
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  // Estados para almacenar los datos del formulario
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [idVirtualCashPoint, setIdVirtualCashPoint] = useState("");
  // Estado para almacenar datos de cajas virtuales
  const [virtualCashPoints, setVirtualCashPoints] = useState([]);
  // Estado para mostrar alertas
  const [alertInfo, setAlertInfo] = useState(null);
  // Estado para el usuario en edición
  const [editingUser, setEditingUser] = useState(null);

  // Cargar datos iniciales
  useEffect(() => {
    if (idcashpoint) {
      // Verifica si idcashpoint existe antes de llamar a fetchUsers
      fetchUsers();
    }
  }, [idcashpoint]); // Agrega idcashpoint como dependencia

  // Limpiar formulario y alerta cuando se cierra el modal
  useEffect(() => {
    if (!showModal) {
      setUsername("");
      setPassword("");
      setRole("");
      setIdVirtualCashPoint("");
      setAlertInfo(null);
    }
  }, [showModal]);

  // Limiar el formulario y alerta cuando se cierra el modal de edicion
  useEffect(() => {
    if (!showEditModal) {
      setUsername("");
      setPassword("");
      setRole("");
      setIdVirtualCashPoint("");
      setAlertInfo(null);
    }
  }, [showEditModal]);

  // Función para obtener la lista de usuarios de la caja en especifico
  const fetchUsers = async () => {
    try {
      const response = await axios.get(`/api/users/${idcashpoint.idcashpoint}`);
      setUsers(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  // Función para obtener la lista de cajas virtuales
  const fetchVirtualCashPoints = async () => {
    let response = null;
    try {
      response = await axios.get(
        `/api/virtualcashpoints/${idcashpoint.idcashpoint}`
      );
      setVirtualCashPoints(response.data);
    } catch (error) {
      console.error(error);
    }

    // No se puede agregar usuarios si no existen cajas virtuales creadas
    if (response.data.length === 0) {
      setAlertInfo({
        variant: "danger",
        message:
          "No se puede agregar usuarios porque no existen cajas virtuales creadas.",
      });
      return;
    } else {
      setAlertInfo(null);
    }
  };

  // Función para crear un usuario
  const createUser = async () => {
    try {
      if (username && password && role && idVirtualCashPoint) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await axios.post("/api/users", {
          username,
          password: hashedPassword,
          role,
          idCashPoint: idcashpoint.idcashpoint,
          idVirtualCashPoint,
        });
        setUsername("");
        setPassword("");
        setRole("");
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
    setRole(user.role);
    setIdVirtualCashPoint(user.idvirtualcashpoint);
    setShowEditModal(true);
  };

  // Función para actualizar un usuario
  const updateUser = async () => {
    try {
      if (editingUser) {
        let updatedUser = {
          ...editingUser,
          username,
          role,
          idCashPoint: idcashpoint.idcashpoint,
          idVirtualCashPoint,
        };

        if (password !== "") {
          const hashedPassword = await bcrypt.hash(password, 10);
          updatedUser = {
            ...updatedUser,
            password: hashedPassword,
          };
        }

        await axios.put(`/api/users/${editingUser.iduser}`, updatedUser);
        setEditingUser(null);
        setShowEditModal(false);
        setUsername("");
        setPassword("");
        setRole("");
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
      setShowEditModal(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Container>
      <h1>CRUD de Usuarios</h1>
      <Button
        variant="primary"
        onClick={() => {
          setShowModal(true);
          fetchVirtualCashPoints();
        }}
      >
        Agregar Usuario
      </Button>
      <div style={{ height: "70vh", overflowY: "auto" }}>
        <Table striped bordered hover className="mt-3">
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Rol</th>
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
                <td>{user.idvirtualcashpoint}</td>
                <td>
                  <Button
                    variant="success"
                    onClick={() => {
                      editUser(user);
                      fetchVirtualCashPoints();
                    }}
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
              <Form.Label>Caja Virtual</Form.Label>
              <Form.Select
                value={idVirtualCashPoint}
                onChange={(e) => setIdVirtualCashPoint(e.target.value)}
              >
                <option value="">-- Seleccione una opción --</option>
                {virtualCashPoints.map((virtualCashPoint) => (
                  <option
                    key={virtualCashPoint.idvirtualcashpoint}
                    value={virtualCashPoint.idvirtualcashpoint}
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
                placeholder="Ingrese una nueva contraseña"
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
              <Form.Label>Caja Virtual</Form.Label>
              <Form.Select
                value={idVirtualCashPoint}
                onChange={(e) => setIdVirtualCashPoint(e.target.value)}
              >
                {virtualCashPoints.map((virtualCashPoint) => (
                  <option
                    key={virtualCashPoint.idvirtualcashpoint}
                    value={virtualCashPoint.idvirtualcashpoint}
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
            onClick={() => deleteUser(editingUser.iduser)}
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
