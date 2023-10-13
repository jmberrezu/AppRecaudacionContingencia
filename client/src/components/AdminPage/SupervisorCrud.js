import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Container, Button, Table, Modal, Alert, Form } from "react-bootstrap";
import { PencilSquare, PlusCircle } from "react-bootstrap-icons";
import { useCallback } from "react";

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
  const [office, setOffice] = useState("");
  const [password, setPassword] = useState("");
  const [idCashPoint, setIdCashPoint] = useState("");
  // Para la lista de empresas
  const [empresas, setEmpresas] = useState([]);
  const [societydivision, setSocietyDivision] = useState("");
  // Para editar un supervisor
  const [editingSupervisor, setEditingSupervisor] = useState(null);
  // Para mostrar alertas
  const [alertInfo, setAlertInfo] = useState(null);

  // Obtener token de local stroage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      axios
        .get("http://localhost:5000/api/login/verify", {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
        .then((response) => {
          // Verificar el rol aquí
          if (response.data.role !== "admin") {
            navigate("/");
          } else {
            // Si el rol es admin, actualizar el estado del token
            setToken(storedToken);
          }
        })
        .catch((error) => {
          // Manejar errores de la petición
          console.error("Error verifying token:", error);
          navigate("/");
        });
    } else {
      navigate("/");
    }
  }, [navigate]);

  // Función para obtener la lista de usuarios
  const fetchSupervisors = useCallback(async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSupervisors(response.data);
    } catch (error) {
      console.error(error);
    }
  }, [token]);

  // Obtener lista de empresas
  const fetchEmpresas = useCallback(async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/admin/company",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setEmpresas(response.data);
    } catch (error) {
      console.error(error);
    }
  }, [token]);

  // Cargar datos iniciales
  useEffect(() => {
    if (token) {
      fetchSupervisors();
      fetchEmpresas();
    }
  }, [token, fetchSupervisors, fetchEmpresas]);

  // Limpiar los campos de los modales
  useEffect(() => {
    if (!showModal) {
      setUsername("");
      setOffice("");
      setSocietyDivision("");
      setPassword("");
      setIdCashPoint("");
      setAlertInfo(null);
    }
  }, [showModal]);

  useEffect(() => {
    if (!showEditModal) {
      setUsername("");
      setOffice("");
      setSocietyDivision("");
      setPassword("");
      setIdCashPoint("");
      setAlertInfo(null);
    }
  }, [showEditModal]);

  // Agregar un nuevo supervisor
  const createSupervisor = async () => {
    try {
      if (username && societydivision && password && idCashPoint && office) {
        await axios.post(
          "http://localhost:5000/api/admin/agregar",
          {
            username: username,
            office: office,
            societydivision: societydivision,
            password: password,
            idCashPoint: idCashPoint,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setUsername("");
        setOffice("");
        setSocietyDivision("");
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
        error.response.data.message === "office must be 2 to 50 characters"
      ) {
        setAlertInfo({
          variant: "danger",
          message: "La oficina debe ser de 2 a 50 caracteres.",
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
    setOffice(supervisor.office);
    setSocietyDivision(supervisor.societydivision);
    setIdCashPoint(supervisor.idcashpoint);
    setShowEditModal(true);
  };

  // Actualizar un supervisor
  const updateSupervisor = async () => {
    try {
      let updateSupervisor = {
        ...editingSupervisor,
        username,
        office,
        societydivision,
        password,
        idCashPoint,
      };
      await axios.put(
        `http://localhost:5000/api/admin/${editingSupervisor.idcashpoint}`,
        updateSupervisor,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setEditingSupervisor(null);
      setShowEditModal(false);
      setUsername("");
      setOffice("");
      setSocietyDivision("");
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
      await axios.delete(`http://localhost:5000/api/admin/${idcashpoint}`, {
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

  // Función para bloquear o desbloquear un usuario
  const handleBlockUser = async (idcashpoint, isblocked) => {
    try {
      await axios.put(
        `http://localhost:5000/api/admin/block/${idcashpoint}`,
        { isblocked },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Actualiza la lista de supervisores
      setSupervisors((prevSupervisors) =>
        prevSupervisors.map((supervisor) =>
          supervisor.idcashpoint === idcashpoint
            ? { ...supervisor, isblocked }
            : supervisor
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <Container className="mt-4 ">
        <h1>Administración de Supervisores</h1>
        <hr />
        <Button
          variant="warning"
          onClick={() => {
            setShowModal(true);
          }}
        >
          <PlusCircle className="me-2 mb-1" />
          Agregar Supervisor
        </Button>
        <div className="mt-2" style={{ height: "69vh", overflowY: "auto" }}>
          <Table striped bordered hover className="mt-3">
            <thead>
              <tr>
                <th>Sociedad / División</th>
                <th>ID de Caja SAP</th>
                <th>Usuario</th>
                <th>Oficina SAP</th>
                <th>Acciones</th>
                <th>Bloqueado</th>
              </tr>
            </thead>
            <tbody>
              {supervisors.map((supervisor) => (
                <tr key={supervisor.idcashpoint}>
                  <td>{supervisor.societydivision}</td>
                  <td>{supervisor.idcashpoint}</td>
                  <td>{supervisor.user}</td>
                  <td>{supervisor.office}</td>
                  <td className="d-flex justify-content-between">
                    <div>
                      <Button
                        className="me-1"
                        variant="success"
                        onClick={() => {
                          editSupervisor(supervisor);
                        }}
                      >
                        <PencilSquare
                          size={16}
                          className="align-middle mb-1 me-2"
                        />
                        Editar
                      </Button>
                    </div>
                  </td>

                  <td>
                    <Form.Check
                      type="switch"
                      checked={supervisor.isblocked}
                      onChange={(e) =>
                        handleBlockUser(
                          supervisor.idcashpoint,
                          e.target.checked
                        )
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
                <Form.Label>Sociedad / División</Form.Label>
                {/* Mostrar la lista de sociedades que existen */}
                <Form.Control
                  as="select"
                  value={societydivision}
                  onChange={(e) => setSocietyDivision(e.target.value)}
                >
                  <option value="">
                    -- Seleccione una sociedad / división --
                  </option>
                  {empresas.map((empresa) => (
                    <option
                      key={empresa.societydivision}
                      value={empresa.societydivision}
                    >
                      {empresa.societydivision + " - " + empresa.name}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
              <Form.Group>
                <Form.Label>ID de Caja SAP</Form.Label>
                <Form.Control
                  type="text"
                  value={idCashPoint}
                  onChange={(e) => setIdCashPoint(e.target.value)}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Oficina SAP</Form.Label>
                <Form.Control
                  type="text"
                  value={office}
                  onChange={(e) => setOffice(e.target.value)}
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
                <Form.Label>Sociedad / División</Form.Label>
                {/* Mostrar la lista de sociedades que existen */}
                <Form.Control
                  as="select"
                  value={societydivision}
                  onChange={(e) => setSocietyDivision(e.target.value)}
                >
                  <option value="">
                    -- Seleccione una sociedad / división --
                  </option>
                  {empresas.map((empresa) => (
                    <option
                      key={empresa.societydivision}
                      value={empresa.societydivision}
                    >
                      {empresa.societydivision + " - " + empresa.name}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
              <Form.Group>
                <Form.Label>ID de Caja SAP</Form.Label>
                <Form.Control
                  type="text"
                  value={idCashPoint}
                  disabled={true}
                  onChange={(e) => setIdCashPoint(e.target.value)}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Oficina SAP</Form.Label>
                <Form.Control
                  type="text"
                  value={office}
                  onChange={(e) => setOffice(e.target.value)}
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
