import React, { useState, useEffect, useCallback } from "react";
import { Container, Table, Button, Modal, Form, Alert } from "react-bootstrap";
import {
  PlusCircle,
  PencilSquare,
  PersonFillAdd,
  InfoCircle,
} from "react-bootstrap-icons";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function CompanyCrud() {
  const [token, setToken] = useState("");
  const [empresas, setEmpresas] = useState([]);
  const [societydivision, setSocietyDivision] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [alertInfo, setAlertInfo] = useState(null);
  const [editingEmpresa, setEditingEmpresa] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvSocietyDivision, setCsvSocietyDivision] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [name, setName] = useState("");

  const navigate = useNavigate();

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

  // Obtener lista de empresas al cargar la página
  useEffect(() => {
    if (token) fetchEmpresas();
  }, [token, fetchEmpresas]);

  // Limpiar los campos de los modales
  useEffect(() => {
    if (!showModal) {
      setName("");
      setSocietyDivision("");
      setAlertInfo(null);
    }
  }, [showModal]);

  useEffect(() => {
    if (!showEditModal) {
      setName("");
      setSocietyDivision("");
      setAlertInfo(null);
    }
  }, [showEditModal]);

  // Crear empresa
  const createEmpresa = async () => {
    try {
      if (name && societydivision) {
        await axios.post(
          "http://localhost:5000/api/admin/company",
          {
            societydivision: societydivision,
            name: name,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setName("");
        setSocietyDivision("");
        setAlertInfo({
          variant: "success",
          message: "Empresa agregada exitosamente",
        });
        fetchEmpresas();
      } else {
        setAlertInfo({
          variant: "danger",
          message: "Por favor, llene todos los campos.",
        });
      }
    } catch (error) {
      if (
        error.response.data.message ===
        "societydivision must be 2 to 21 characters"
      ) {
        setAlertInfo({
          variant: "danger",
          message: "La sociedad division debe ser de 16 o 21 caracteres.",
        });
      } else if (
        error.response.data.message === "name must be 2 to 50 characters"
      ) {
        setAlertInfo({
          variant: "danger",
          message: "El nombre debe ser de 2 a 50 caracteres.",
        });
      } else if (
        error.response.data.message === "societydivision already exists"
      ) {
        setAlertInfo({
          variant: "danger",
          message: "La sociedad division ya existe.",
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

  // Editar empresa
  const editEmpresa = async (empresa) => {
    setEditingEmpresa(empresa);
    setSocietyDivision(empresa.societydivision);
    setName(empresa.name);
    setShowEditModal(true);
  };

  // Actualizar empresa
  const updateEmpresa = async () => {
    try {
      if (name && societydivision) {
        let updateEmpresa = {
          ...editingEmpresa,
          name,
          societydivision,
        };
        await axios.put(
          `http://localhost:5000/api/admin/company/${editingEmpresa.societydivision}`,
          updateEmpresa,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setEditingEmpresa(null);
        setShowEditModal(false);
        setSocietyDivision("");
        setName("");
        setAlertInfo({
          variant: "success",
          message: "Empresa actualizada exitosamente",
        });
        fetchEmpresas();
      } else {
        setAlertInfo({
          variant: "danger",
          message: "Por favor, llene todos los campos.",
        });
      }
    } catch (error) {
      console.error(error);
      // Mostrar alerta
      setAlertInfo({
        variant: "danger",
        message: error.response.data.message,
      });
    }
  };

  // Eliminar empresa
  const deleteEmpresa = async (societydivision) => {
    try {
      await axios.delete(
        `http://localhost:5000/api/admin/company/${societydivision}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      fetchEmpresas();
      setShowEditModal(false);
    } catch (error) {
      console.error(error);
      // Mostrar alerta
      setAlertInfo({
        variant: "danger",
        message: error.response.data.message,
      });
    }
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
        formData.append("societydivision", csvSocietyDivision); // Agregar societydivision como parte del FormData

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
      <Container className="mt-4 ">
        <h1>Administración de Empresas</h1>
        <hr />
        <Button
          variant="warning"
          onClick={() => {
            setShowModal(true);
          }}
        >
          <PlusCircle className="me-2 mb-1" />
          Agregar Empresa
        </Button>
        <div className="mt-2" style={{ height: "69vh", overflowY: "auto" }}>
          <Table striped bordered hover className="mt-3">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Sociedad / División</th>
              </tr>
            </thead>
            <tbody>
              {empresas.map((empresa) => (
                <tr key={empresa.societydivision}>
                  <td>{empresa.name}</td>
                  <td>{empresa.societydivision}</td>
                  <td className="d-flex justify-content-between">
                    <div>
                      <Button
                        className="me-1"
                        variant="success"
                        onClick={() => {
                          editEmpresa(empresa);
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
                          setCsvSocietyDivision(empresa.societydivision);
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
        </div>
        <Modal show={showModal} onHide={() => setShowModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Agregar Empresa</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {/* Mostrar alerta si es necesario */}
            {alertInfo && (
              <Alert variant={alertInfo.variant}>{alertInfo.message}</Alert>
            )}
            {/* Formulario para agregar empresa */}
            <Form>
              <Form.Group>
                <Form.Label>Nombre</Form.Label>
                <Form.Control
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Sociedad / División</Form.Label>
                <Form.Control
                  type="text"
                  value={societydivision}
                  onChange={(e) => setSocietyDivision(e.target.value)}
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cerrar
            </Button>
            <Button variant="primary" onClick={createEmpresa}>
              Agregar
            </Button>
          </Modal.Footer>
        </Modal>
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Editar Empresa</Modal.Title>
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
                <Form.Control
                  type="text"
                  value={societydivision}
                  disabled={true}
                  onChange={(e) => setSocietyDivision(e.target.value)}
                />
              </Form.Group>
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
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteEmpresa(societydivision)}
            >
              Eliminar
            </Button>
            <Button variant="primary" onClick={updateEmpresa}>
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
              Sociedad: <strong>{csvSocietyDivision}</strong>
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

export default CompanyCrud;
