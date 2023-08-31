import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Container,
  Button,
  Table,
  Modal,
  Alert,
  Form,
  Nav,
  Navbar,
} from "react-bootstrap";

function SupervisorCrud() {
  // Para el token y la navegación
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  // Para los modales
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  // Para el CRUD
  const [supervisors, setSupervisors] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [idCashPoint, setIdCashPoint] = useState("");
  // Para editar un supervisor
  const [editingSupervisor, setEditingSupervisor] = useState(null);
  // Para mostrar alertas
  const [alertInfo, setAlertInfo] = useState(null);

  // Obtener token de local stroage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      axios
        .get("/api/admin/verify", {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
        .then((response) => {
          // Verificar el rol aquí
          if (response.data.role !== "admin") {
            navigate("/admin");
          } else {
            // Si el rol es admin, actualizar el estado del token
            setToken(storedToken);
          }
        })
        .catch((error) => {
          // Manejar errores de la petición
          console.error("Error verifying token:", error);
          navigate("/admin");
        });
    } else {
      navigate("/admin");
    }
  }, [navigate]);

  // Cargar datos iniciales
  useEffect(() => {
    if (token) {
      fetchSupervisors();
    }
  }, [token]);

  // Limpiar los campos de los modales
  useEffect(() => {
    if (!showModal) {
      setUsername("");
      setPassword("");
      setIdCashPoint("");
      setAlertInfo(null);
    }
  }, [showModal]);

  useEffect(() => {
    if (!showEditModal) {
      setUsername("");
      setPassword("");
      setIdCashPoint("");
      setAlertInfo(null);
    }
  }, [showEditModal]);

  // Función para obtener la lista de usuarios
  const fetchSupervisors = async () => {
    try {
      const response = await axios.get("/api/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSupervisors(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  // Agregar un nuevo supervisor
  const createSupervisor = async () => {
    try {
      if (username && password && idCashPoint) {
        await axios.post(
          "/api/admin/agregar",
          {
            username: username,
            password: password,
            idCashPoint: idCashPoint,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setUsername("");
        setPassword("");
        setIdCashPoint("");
        setAlertInfo({
          variant: "success",
          message: "Supervisor agregado exitosamente",
        });
        fetchSupervisors();
      } else {
        setAlertInfo({
          variant: "danger",
          message: "Por favor, complete todos los campos requeridos.",
        });
      }
    } catch (error) {
      // Si el idCashPoint ingresado no es de 16 o 21 caracteres
      if (
        error.response.data.message ===
        "idCashPoint must be 16 or 21 characters"
      ) {
        setAlertInfo({
          variant: "danger",
          message: "El ID de caja debe ser de 16 o 21 caracteres.",
        });
      } else if (
        error.response.data.message === "username must be 2 to 50 characters"
      ) {
        setAlertInfo({
          variant: "danger",
          message: "El usuario debe ser de 2 a 50 caracteres.",
        });
      } else if (
        error.response.data.message === "password must be 2 to 60 characters"
      ) {
        setAlertInfo({
          variant: "danger",
          message: "La contraseña debe ser de mayor a 2 caracteres.",
        });
      } else if (error.response.data.message === "idCashPoint already exists") {
        setAlertInfo({
          variant: "danger",
          message: "El ID de caja ya existe.",
        });
      } else {
        setAlertInfo({
          variant: "danger",
          message: error.response.data.message,
        });
        console.error(error);
      }
    }
  };

  // Función para editar un supervisor
  const editSupervisor = (supervisor) => {
    setEditingSupervisor(supervisor);
    setUsername(supervisor.user);
    setIdCashPoint(supervisor.idcashpoint);
    setShowEditModal(true);
  };

  // Actualizar un supervisor
  const updateSupervisor = async () => {
    try {
      let updateSupervisor = {
        ...editingSupervisor,
        username,
        password,
        idCashPoint,
      };
      await axios.put(
        `/api/admin/${editingSupervisor.idcashpoint}`,
        updateSupervisor,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setEditingSupervisor(null);
      setShowEditModal(false);
      setUsername("");
      setPassword("");
      setIdCashPoint("");
      setAlertInfo({
        variant: "success",
        message: "Supervisor actualizado exitosamente",
      });
      fetchSupervisors();
    } catch (error) {
      console.error(error);
      setAlertInfo({
        variant: "danger",
        message: error.response.data.message,
      });
    }
  };

  // Eliminar un supervisor
  const deleteSupervisor = async (idcashpoint) => {
    try {
      await axios.delete(`/api/admin/${idcashpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchSupervisors();
      setShowEditModal(false);
    } catch (error) {
      // Si el error es 400 es que el supervisor no puede ser eliminado ya que tiene transacciones
      if (error.response.status === 400) {
        setAlertInfo({
          variant: "danger",
          message:
            "El supervisor no puede ser eliminado ya que tiene transacciones.",
        });
      } else {
        setAlertInfo({
          variant: "danger",
          message: error.response.data.message,
        });
      }
    }
  };

  // Cerrar sesión
  const handleLogout = () => {
    // Limpiar el token y redirigir al inicio de sesión
    localStorage.removeItem("token");
    navigate("/admin");
  };

  return (
    <div>
      <Navbar className="bg-body-tertiary stick" expand="sm" sticky="top">
        <Container>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Nav>
            <Navbar.Brand>App Recaudación</Navbar.Brand>
          </Nav>
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto"></Nav>
            <Nav>
              <Nav.Item className="">
                <Button variant="outline-warning" onClick={handleLogout}>
                  Cerrar Sesión
                </Button>
              </Nav.Item>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <Container className="mt-4 ">
        <h1>CRUD de Supervisores</h1>

        <Button
          variant="warning"
          onClick={() => {
            setShowModal(true);
          }}
        >
          Agregar Supervisor
        </Button>
        <Table striped bordered hover className="mt-3">
          <thead>
            <tr>
              <th>ID de Caja</th>
              <th>Usuario</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {supervisors.map((supervisor) => (
              <tr key={supervisor.idcashpoint}>
                <td>{supervisor.idcashpoint}</td>
                <td>{supervisor.user}</td>
                <td>
                  <Button
                    variant="success"
                    onClick={() => {
                      editSupervisor(supervisor);
                    }}
                  >
                    Editar
                  </Button>{" "}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Agregar Supervisor</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {/* Mostrar alerta si es necesario */}
            {alertInfo && (
              <Alert variant={alertInfo.variant}>{alertInfo.message}</Alert>
            )}
            {/* Formulario para agregar supervisor */}
            <Form>
              <Form.Group>
                <Form.Label>ID de Caja</Form.Label>
                <Form.Control
                  type="text"
                  value={idCashPoint}
                  onChange={(e) => setIdCashPoint(e.target.value)}
                />
              </Form.Group>
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
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cerrar
            </Button>
            <Button variant="primary" onClick={createSupervisor}>
              Agregar
            </Button>
          </Modal.Footer>
        </Modal>
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Editar Supervisor</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {/* Mostrar alerta si es necesario */}
            {alertInfo && (
              <Alert variant={alertInfo.variant}>{alertInfo.message}</Alert>
            )}
            {/* Formulario para editar supervisor */}
            <Form>
              <Form.Group>
                <Form.Label>ID de Caja</Form.Label>
                <Form.Control
                  type="text"
                  value={idCashPoint}
                  disabled={true}
                  onChange={(e) => setIdCashPoint(e.target.value)}
                />
              </Form.Group>
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
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteSupervisor(idCashPoint)}
            >
              Eliminar
            </Button>
            <Button variant="primary" onClick={updateSupervisor}>
              Guardar
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
}

export default SupervisorCrud;
