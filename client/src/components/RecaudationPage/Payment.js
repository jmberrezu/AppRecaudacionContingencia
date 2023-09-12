import axios from "axios";
import React, { useState, useEffect } from "react";
import { Alert, Container, Form, Button, InputGroup } from "react-bootstrap";
import { Cash, Search } from "react-bootstrap-icons";
import Modal from "react-bootstrap/Modal";
import { useNavigate } from "react-router-dom";
import GenerateComprobant from "./GenerateComprobant";

function Payment({ user }) {
  const navigate = useNavigate();
  const [token, setToken] = useState("");

  const [showModal, setShowModal] = useState(false); // Estado para controlar la visualización del modal
  const [paymentData, setPaymentData] = useState(null); // Estado para almacenar los datos del pago

  const [cuentaContrato, setCuentaContrato] = useState("");
  const [cliente, setCliente] = useState("");
  const [deuda, setDeuda] = useState("");
  const [direccion, setDireccion] = useState("");
  const [dolares, setDolares] = useState("");
  const [centavos, setCentavos] = useState("");

  // Estado para mostrar alertas
  const [alertInfo, setAlertInfo] = useState(null);

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
          // Verificar el rol del usuario
          if (
            response.data.role !== "cajero" &&
            response.data.role !== "gerente"
          ) {
            navigate("/");
          } else {
            setToken(storedToken);
          }
        })
        .catch((error) => {
          console.error("Error verifying token: ", error);
          navigate("/");
        });
    } else {
      navigate("/");
    }
  }, [navigate]);

  const buscarCliente = async (cuentaContrato) => {
    setAlertInfo(null);

    try {
      const response = await fetch(
        `http://localhost:5000/api/paymentRoutes/buscar-cliente/${cuentaContrato}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const clienteEncontrado = await response.json();
        setCliente(clienteEncontrado);
        setCuentaContrato(clienteEncontrado.payercontractaccountid);
        setDeuda(clienteEncontrado.debt);
        setDireccion(clienteEncontrado.address);
      } else {
        setAlertInfo({
          variant: "danger",
          message:
            "No se encontró ningún cliente con la cuenta de contrato ingresada.",
        });
        setCliente(null);
        setDeuda("");
        setDireccion("");
      }
    } catch (error) {
      console.error(error);
      setAlertInfo({
        variant: "danger",
        message: "Ocurrió un error al buscar el cliente.",
      });
      setCliente(null);
      setDeuda("");
      setDireccion("");
    }
  };

  const realizarPago = async () => {
    //Comprobar que todos los campos esten llenos
    if (dolares === "" || centavos === "") {
      setAlertInfo({
        variant: "danger",
        message: "Por favor ingrese un monto válido.",
      });
      return;
    }

    const cantidadTotal = parseFloat(dolares + "." + centavos);

    try {
      //Si todo esta bien se reestablecen los campos
      setAlertInfo(null);

      const response = await fetch(
        "http://localhost:5000/api/paymentRoutes/realizar-pago",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            cantidadTotal,
            cuentaContrato,
            user: user,
          }),
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        setPaymentData(responseData); // Almacenar los datos del pago
        setShowModal(true); // Abrir el modal
      } else {
        setAlertInfo({
          variant: "danger",
          message: "Error al realizar el pago.",
        });
      }

      // Si recibo un error 400 muestro el mensaje
      if (response.status === 400) {
        const responseData = await response.json();
        setAlertInfo({
          variant: "danger",
          message: responseData.error,
        });
      }
    } catch (error) {
      console.error(error);
      setAlertInfo({
        variant: "danger",
        message: "Ocurrió un error al realizar el pago.",
      });
    }
  };

  const handleCuentaContratoChange = (e) => {
    // Asegurarse de que solo se ingresen números
    const inputValue = e.target.value.replace(/[^\d]/g, "");
    setCuentaContrato(inputValue);
    setCliente(null); // Cuando se comienza a editar, se resetea el cliente a null
  };

  const handleDolaresChange = (e) => {
    // Asegurarse de que solo se ingresen números
    const inputValue = e.target.value.replace(/[^\d]/g, "");
    setDolares(inputValue);
  };

  const handleCentavosChange = (e) => {
    // Asegurarse de que solo se ingresen números y máximo 2 dígitos
    const inputValue = e.target.value.replace(/[^\d]/g, "").slice(0, 2);
    setCentavos(inputValue);
  };

  return (
    <Container className="py-4 border" style={{ maxWidth: "800px" }}>
      <h1>Realizar Pago</h1>

      <Form>
        <div className="input-group my-3 mb-4">
          <Form.Control
            type="text"
            placeholder="Ingresa la cuenta contrato o CUEN del cliente"
            value={cuentaContrato}
            onChange={handleCuentaContratoChange}
          />
          <Container className="d-grid col-4 mx-auto">
            <Button
              variant="primary"
              onClick={() => buscarCliente(cuentaContrato)}
            >
              Buscar <Search className="ms-2" />
            </Button>
          </Container>
        </div>

        {alertInfo && (
          <Alert variant={alertInfo.variant}>{alertInfo.message}</Alert>
        )}

        {cliente && (
          <>
            <InputGroup className="mb-3">
              <InputGroup.Text id="formCuentaContrato">
                Cuenta Contrato
              </InputGroup.Text>
              <Form.Control type="text" value={cuentaContrato} disabled />
            </InputGroup>
            <InputGroup className="mb-3">
              <InputGroup.Text id="formNombre">
                Nombre del Cliente
              </InputGroup.Text>
              <Form.Control type="text" value={cliente.name} disabled />
            </InputGroup>

            <InputGroup className="mb-3">
              <InputGroup.Text id="formDireccion">Dirección</InputGroup.Text>
              <Form.Control type="text" value={direccion} disabled />
            </InputGroup>
            <InputGroup className="mb-3">
              <InputGroup.Text id="formDeuda">Deuda</InputGroup.Text>
              <Form.Control type="text" value={deuda} disabled />
            </InputGroup>

            <Container className="d-flex justify-content-center">
              <InputGroup className="pt-4" style={{ maxWidth: "400px" }}>
                <InputGroup.Text id="formPago">Pago</InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Dólares"
                  value={dolares}
                  onChange={handleDolaresChange}
                />
                <InputGroup.Text id="formPago">.</InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Centavos"
                  value={centavos}
                  onChange={handleCentavosChange}
                />
                <InputGroup.Text id="formPago">$</InputGroup.Text>
              </InputGroup>
            </Container>

            <Container className="d-grid mt-2" style={{ maxWidth: "425px" }}>
              <Button variant="success" onClick={realizarPago}>
                Pagar <Cash className="ms-2" />
              </Button>
            </Container>
          </>
        )}
      </Form>
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Pago Realizado con Éxito</Modal.Title>
        </Modal.Header>
        {cliente && (
          <>
            <Modal.Body>
              {/* Mostrar los datos del pago */}
              {paymentData && (
                <>
                  <p>
                    <strong>Fecha: </strong>
                    {paymentData.date}
                  </p>
                  <p>
                    <strong>Cuenta Contrato: </strong>
                    {cuentaContrato}
                  </p>
                  <p>
                    <strong>Nombre del Cliente: </strong>
                    {cliente.name}
                  </p>
                  <p>
                    <strong>Dirección: </strong>
                    {direccion}
                  </p>
                  <p>
                    <strong>Cantidad Pagada: </strong>
                    {paymentData.amount} $
                  </p>
                </>
              )}
            </Modal.Body>
          </>
        )}
        <Modal.Footer>
          <GenerateComprobant
            user={user}
            paymentData={paymentData}
            direccion={direccion}
            cuentaContrato={cuentaContrato}
            cliente={cliente}
          />

          <Button
            variant="primary"
            onClick={() => {
              setShowModal(false);
              setCliente(null);
              setDireccion("");
              setDolares("");
              setCentavos("");
              setCuentaContrato("");
              setDeuda("");
            }}
          >
            Aceptar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Payment;
