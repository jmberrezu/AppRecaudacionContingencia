import React, { useState, useEffect } from "react";
import axios from "axios";
import { Container, Table, Button, Modal, Form, Alert } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { PencilSquare, PlusCircle } from "react-bootstrap-icons";
import { useCallback } from "react";

function UserCrud({ societydivision, idcashpoint }) {
  // Para el token y la navegación
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  // Estado para almacenar los usuarios
  const [users, setUsers] = useState([]);
  // Estados para controlar la visibilidad de los modales
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  // Estados para almacenar los datos del formulario
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [idGlobalVirtualCashPoint, setIdGlobalVirtualCashPoint] = useState("");
  // Estado para almacenar datos de cajas virtuales
  const [virtualCashPoints, setVirtualCashPoints] = useState([]);
  // Estado para mostrar alertas
  const [alertInfo, setAlertInfo] = useState(null);
  // Estado para el usuario en edición
  const [editingUser, setEditingUser] = useState(null);

  // Obtener el token del local storage
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

  // Función para obtener la lista de usuarios de la caja en especifico
  const fetchUsers = useCallback(async () => {
    if (idcashpoint) {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/users/${idcashpoint}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setUsers(response.data);
      } catch (error) {
        console.error(error);
      }
    }
  }, [token, idcashpoint]);

  // Cargar datos iniciales
  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token, idcashpoint, fetchUsers]); // Agrega idcashpoint como dependencia

  // Limpiar formulario y alerta cuando se cierra el modal
  useEffect(() => {
    if (!showModal) {
      setUsername("");
      setPassword("");
      setRole("");
      setIdGlobalVirtualCashPoint("");
      setAlertInfo(null);
    }
  }, [showModal]);

  // Limiar el formulario y alerta cuando se cierra el modal de edicion
  useEffect(() => {
    if (!showEditModal) {
      setUsername("");
      setPassword("");
      setRole("");
      setIdGlobalVirtualCashPoint("");
      setAlertInfo(null);
    }
  }, [showEditModal]);

  // Función para obtener la lista de cajas virtuales
  const fetchVirtualCashPoints = async () => {
    let response = null;
    try {
      response = await axios.get(
        `http://localhost:5000/api/virtualcashpoints/${idcashpoint}`,
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
      if (username && password && role && idGlobalVirtualCashPoint) {
        await axios.post(
          "http://localhost:5000/api/users",
          {
            username,
            password,
            role,
            idCashPoint: idcashpoint,
            societydivision: societydivision,
            idGlobalVirtualCashPoint,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setUsername("");
        setPassword("");
        setRole("");
        setIdGlobalVirtualCashPoint("");
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
      if (
        error.response.data.message === "username must be 2 to 50 characters"
      ) {
        setAlertInfo({
          variant: "danger",
          message: "El nombre de usuario debe tener entre 2 y 50 caracteres.",
        });
      } else if (
        error.response.data.message === "password must be 2 to 60 characters"
      ) {
        setAlertInfo({
          variant: "danger",
          message: "La contraseña debe tener entre 2 y 60 caracteres.",
        });
      } else {
        setAlertInfo({
          variant: "danger",
          message: error.response.data.message,
        });
      }
    }
  };

  // Función para editar un usuario
  const editUser = (user) => {
    setEditingUser(user);
    setUsername(user.username);
    setRole(user.role);
    setIdGlobalVirtualCashPoint(user.idglobalvirtualcashpoint);
    setShowEditModal(true);
  };

  // Función para actualizar un usuario
  const updateUser = async () => {
    try {
      let updatedUser = {
        ...editingUser,
        username,
        password,
        role,
        idCashPoint: idcashpoint,
        societydivision: societydivision,
        idGlobalVirtualCashPoint,
      };
      await axios.put(
        `http://localhost:5000/api/users/${editingUser.idglobaluser}`,
        updatedUser,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setEditingUser(null);
      setShowEditModal(false);
      setUsername("");
      setPassword("");
      setRole("");
      setIdGlobalVirtualCashPoint("");
      setAlertInfo({
        variant: "success",
        message: "Usuario actualizado exitosamente.",
      });
      fetchUsers();
    } catch (error) {
      console.error(error);
      setAlertInfo({
        variant: "danger",
        message: error.response.data.message,
      });
    }
  };

  // Función para eliminar un usuario
  const deleteUser = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/users/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchUsers();
      setShowEditModal(false);
    } catch (error) {
      // Si el error es 400 es que el usuario no puede ser eliminado ya que tiene pagos
      if (error.response.status === 400) {
        setAlertInfo({
          variant: "danger",
          message:
            "El usuario no puede ser eliminado ya que tiene pagos asociados.",
        });
      } else {
        setAlertInfo({
          variant: "danger",
          message: error.response.data.message,
        });
      }
    }
  };

  const handleBlockUser = async (userId, isblocked) => {
    try {
      await axios.put(
        `http://localhost:5000/api/users/block/${userId}`,
        { isblocked },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // Actualizar el estado del usuario en la lista
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.idglobaluser === userId ? { ...user, isblocked } : user
        )
      );
    } catch (error) {
      console.error(error);
      setAlertInfo({
        variant: "danger",
        message: error.response.data.message,
      });
    }
  };

  return (
    <Container>
      <h1>Administración de Usuarios</h1>
      <Button
        variant="primary"
        onClick={() => {
          setShowModal(true);
          fetchVirtualCashPoints();
        }}
      >
        <PlusCircle className="me-2 mb-1" />
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
              <th>Bloqueado</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.idglobaluser}>
                <td>{user.iduser}</td>
                <td>{user.username}</td>
                <td>{user.role}</td>
                <td>{user.virtualcashpointname}</td>
                <td>
                  <Button
                    variant="success"
                    onClick={() => {
                      editUser(user);
                      fetchVirtualCashPoints();
                    }}
                  >
                    <PencilSquare
                      size={16}
                      className="align-middle mb-1 me-2"
                    />
                    Editar
                  </Button>
                </td>
                <td>
                  <Form.Check
                    type="switch"
                    checked={user.isblocked}
                    onChange={(e) =>
                      handleBlockUser(user.idglobaluser, e.target.checked)
                    }
                  />
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
                value={idGlobalVirtualCashPoint}
                onChange={(e) => setIdGlobalVirtualCashPoint(e.target.value)}
              >
                <option value="">-- Seleccione una opción --</option>
                {virtualCashPoints.map((virtualCashPoint) => (
                  <option
                    key={virtualCashPoint.idglobalvirtualcashpoint}
                    value={virtualCashPoint.idglobalvirtualcashpoint}
                  >
                    {virtualCashPoint.name}
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
                value={idGlobalVirtualCashPoint}
                onChange={(e) => setIdGlobalVirtualCashPoint(e.target.value)}
              >
                {virtualCashPoints.map((virtualCashPoint) => (
                  <option
                    key={virtualCashPoint.idglobalvirtualcashpoint}
                    value={virtualCashPoint.idglobalvirtualcashpoint}
                  >
                    {virtualCashPoint.name}
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
            onClick={() => deleteUser(editingUser.idglobaluser)}
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
