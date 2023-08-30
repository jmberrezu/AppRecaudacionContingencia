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
import bcrypt from "bcryptjs-react";

function SupervisorCrud() {
  const navigate = useNavigate();
  const [token, setToken] = useState("");

  const [supervisors, setSupervisors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [idCashPoint, setIdCashPoint] = useState(""); // Add state for idCashPoint
  const [alertInfo, setAlertInfo] = useState(null);
  const [editingSupervisor, setEditingSupervisor] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
    } else {
      axios
        .get("/api/admin/protected", {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          setToken(token);
        })
        .catch((error) => {
          console.error(error);
          navigate("/");
        });
    }
  }, [navigate, setToken]);

  // Cargar datos iniciales
  useEffect(() => {
    fetchSupervisors();
  }, []);

  useEffect(() => {
    if (!showModal) {
      setUsername("");
      setPassword("");
      setIdCashPoint(""); // Clear idCashPoint
      setAlertInfo(null);
    }
  }, [showModal]);

  useEffect(() => {
    if (!showEditModal) {
      setUsername("");
      setPassword("");
      setIdCashPoint(""); // Clear idCashPoint
      setAlertInfo(null);
    }
  }, [showEditModal]);

  // Función para obtener la lista de usuarios
  const fetchSupervisors = async () => {
    try {
      const response = await axios.get("/api/admin"); // No necesitas enviar el token aquí
      setSupervisors(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const editSupervisor = (supervisor) => {
    setEditingSupervisor(supervisor);
    setUsername(supervisor.user);
    setIdCashPoint(supervisor.idcashpoint); // Set idCashPoint
    setShowEditModal(true);
  };

  // Agregar un nuevo supervisor
  const createSupervisor = async () => {
    try {
      if (username && password && idCashPoint) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const existingSupervisor = supervisors.find(
          (supervisor) => supervisor.idcashpoint === idCashPoint
        );

        if (existingSupervisor) {
          setAlertInfo({
            variant: "danger",
            message:
              "La caja ya esta asignada a un supervisor. No se puede agregar.",
          });
        } else {
          await axios.post(
            "/api/admin/agregar",
            {
              username,
              password: hashedPassword,
              idCashPoint,
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
        }
      } else {
        setAlertInfo({
          variant: "danger",
          message: "Por favor, complete todos los campos requeridos.",
        });
      }
    } catch (error) {
      console.error(error);
      setAlertInfo({
        variant: "danger",
        message: error.response.data.message,
      });
    }
  };

  const updateSupervisor = async () => {
    try {
      if (editingSupervisor) {
        const existingSupervisor = supervisors.find(
          (supervisor) =>
            supervisor.idcashpoint === idCashPoint &&
            supervisor.idcashpoint !== editingSupervisor.idcashpoint
        );

        if (existingSupervisor) {
          setAlertInfo({
            variant: "danger",
            message:
              "La caja ya esta asignada a un supervisor. No se puede actualizar.",
          });
        } else {
          let updateSupervisor = {
            ...editingSupervisor,
            username,
            password,
            idCashPoint,
          };
          if (password !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateSupervisor = {
              ...updateSupervisor,
              password: hashedPassword,
            };
          }
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
        }
      }
    } catch (error) {
      console.error(error);
      setAlertInfo({
        variant: "danger",
        message: error.response.data.message,
      });
    }
  };

  const canDeleteSupervisor = async (idCashPoint) => {
    try {
      const response = await axios.get(`/api/admin/canDelete/${idCashPoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.canDelete;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const deleteSupervisor = async (idcashpoint) => {
    try {
      const canDelete = await canDeleteSupervisor(idcashpoint);
      if (canDelete) {
        await axios.delete(`/api/admin/${idcashpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchSupervisors();
        setShowEditModal(false);
      } else {
        setAlertInfo({
          variant: "danger",
          message:
            "No se puede eliminar la caja porque tiene registros relacionados.",
        });
      }
    } catch (error) {
      console.error(error);
      setAlertInfo({
        variant: "danger",
        message: error.response.data.message,
      });
    }
  };

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
