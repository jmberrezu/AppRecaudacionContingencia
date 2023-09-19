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
import {
  InfoCircle,
  PencilSquare,
  PersonFillAdd,
  PlusCircle,
} from "react-bootstrap-icons";
import sparkPayLogo from "../../images/logoM.svg";

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
  // Para editar un supervisor
  const [editingSupervisor, setEditingSupervisor] = useState(null);
  // Para mostrar alertas
  const [alertInfo, setAlertInfo] = useState(null);

  const [showUploadModal, setShowUploadModal] = useState(false);

  const [csvFile, setCsvFile] = useState(null);
  const [csvIDCashPoint, setCsvIDCashPoint] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Obtener token de local stroage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      axios
        .get("http://localhost:5000/api/admin/verify", {
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
      setOffice("");
      setPassword("");
      setIdCashPoint("");
      setAlertInfo(null);
    }
  }, [showModal]);

  useEffect(() => {
    if (!showEditModal) {
      setUsername("");
      setOffice("");
      setPassword("");
      setIdCashPoint("");
      setAlertInfo(null);
    }
  }, [showEditModal]);

  // Función para obtener la lista de usuarios
  const fetchSupervisors = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/admin", {
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
      if (username && office && password && idCashPoint) {
        await axios.post(
          "http://localhost:5000/api/admin/agregar",
          {
            username: username,
            office: office,
            password: password,
            idCashPoint: idCashPoint,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setUsername("");
        setOffice("");
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

  // Cerrar sesión
  const handleLogout = () => {
    // Limpiar el token y redirigir al inicio de sesión
    localStorage.removeItem("token");
    navigate("/admin");
  };

  // Función para manejar la carga de un archivo CSV
  const handleUpload = async (file) => {
    setCsvFile(file);
  };

  const uploadFile = async () => {
    setAlertInfo(null);
    setUploadSuccess(false);

    if (csvFile !== null) {
      setIsUploading(true); // Indicar que se está procesando la carga
      try {
        const formData = new FormData();
        formData.append("csvFile", csvFile);
        formData.append("idcashpoint", csvIDCashPoint); // Agregar idcashpoint como parte del FormData

        const response = await axios.post(
          "http://localhost:5000/api/admin/upload-csv",
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
            onUploadProgress: (progressEvent) => {
              // Calcular el progreso y actualizar el estado
              const progress =
                (progressEvent.loaded / progressEvent.total) * 100;
              setUploadProgress(progress);
            },
          }
        );

        // Manejar la respuesta del servidor (por ejemplo, mostrar una alerta)
        if (response.status === 200) {
          // Mostrar mensaje de éxito y mantener el modal abierto
          setUploadSuccess(true);
        }
      } catch (error) {
        if (error.response && error.response.status === 400) {
          setAlertInfo({
            variant: "danger",
            message: error.response.data.error,
          });
        } else if (error.response && error.response.status === 500) {
          setAlertInfo({
            variant: "danger",
            message: "No se pudo cargar el CSV. " + error.response.data.error,
          });
        } else {
          setAlertInfo({
            variant: "danger",
            message: error.message, // Mostrar el mensaje de error general
          });
        }
      } finally {
        setIsUploading(false); // Indicar que la carga ha terminado
        setCsvFile(null); // Limpiar el archivo
        document.getElementById("csvFile").value = "";
      }
    } else {
      setAlertInfo({
        variant: "danger",
        message: "Por favor, seleccione un archivo CSV.",
      });
    }
  };

  return (
    <div>
      <Navbar className="bg-body-tertiary stick px-5" expand="sm" sticky="top">
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Brand>
          <img
            src={sparkPayLogo}
            alt="SparkPay Logo"
            className="img-fluid me-3 mb-1"
            style={{ width: "45px" }}
          />
          <span className="fs-3 ">Spark-Pay</span>
        </Navbar.Brand>
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto"></Nav>

          <Nav>
            <Nav.Item className="mt-2 mt-sm-0">
              <Button variant="outline-warning" onClick={handleLogout}>
                Cerrar Sesión
              </Button>
            </Nav.Item>
          </Nav>
        </Navbar.Collapse>
      </Navbar>
      <Container className="mt-4 ">
        <h1>Administración de Supervisores</h1>

        <Button
          variant="warning"
          onClick={() => {
            setShowModal(true);
          }}
        >
          <PlusCircle className="me-2 mb-1" />
          Agregar Supervisor
        </Button>
        <Table striped bordered hover className="mt-3">
          <thead>
            <tr>
              <th>ID de Caja</th>
              <th>Usuario</th>
              <th>Oficina</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {supervisors.map((supervisor) => (
              <tr key={supervisor.idcashpoint}>
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
                  <div>
                    <Button
                      className="ms-1"
                      variant="primary"
                      onClick={() => {
                        setCsvIDCashPoint(supervisor.idcashpoint);
                        setShowUploadModal(true);
                      }}
                    >
                      <PersonFillAdd
                        size={16}
                        className="align-middle mb-1 me-2"
                      />
                      Cargar Clientes
                    </Button>
                  </div>
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
                <Form.Label>Oficina</Form.Label>
                <Form.Control
                  type="text"
                  value={office}
                  onChange={(e) => setOffice(e.target.value)}
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
                <Form.Label>Oficina</Form.Label>
                <Form.Control
                  type="text"
                  value={office}
                  onChange={(e) => setOffice(e.target.value)}
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
        <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Cargar Clientes Mediante Archivo CSV</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              {" "}
              Caja: <strong>{csvIDCashPoint}</strong>
            </p>
            {isUploading ? (
              <Alert variant="info">
                <p>Procesando la carga del archivo CSV...</p>
                <div className="progress">
                  <div
                    className="progress-bar progress-bar-striped progress-bar-animated"
                    role="progressbar"
                    style={{ width: `${uploadProgress}%` }}
                    aria-valuenow={uploadProgress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>
              </Alert>
            ) : uploadSuccess ? (
              <Alert variant="success">Archivo CSV cargado exitosamente.</Alert>
            ) : (
              alertInfo && (
                <Alert variant={alertInfo.variant}>{alertInfo.message}</Alert>
              )
            )}
            <Form>
              <Form.Group controlId="csvFile">
                <Form.Label>Selecciona un archivo CSV</Form.Label>
                <Form.Control
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleUpload(e.target.files[0])}
                />
              </Form.Group>
            </Form>
            <Alert variant="primary" className="mt-3">
              <strong>
                <InfoCircle className="me-1 mb-1" />{" "}
              </strong>
              Al cargar un archivo CSV de clientes se eliminarán todos los
              clientes y los pagos realizados por estos. ¿Está seguro que desea
              continuar?
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowUploadModal(false)}
            >
              Volver
            </Button>
            <Button variant="primary" onClick={uploadFile}>
              Subir
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </div>
  );
}

export default SupervisorCrud;
