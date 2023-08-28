import React, { useState, useEffect } from "react";
import { Alert, Container, Form, Button, InputGroup } from "react-bootstrap";
import { Cash, Search } from "react-bootstrap-icons";
import Modal from "react-bootstrap/Modal";

function Payment(props) {
  const { user, token } = props;

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

  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000); // Actualiza cada segundo

    return () => clearInterval(interval);
  }, []);

  const buscarCliente = async (cuentaContrato) => {
    setAlertInfo(null);

    try {
      const response = await fetch(
        `api/paymentRoutes/buscar-cliente/${cuentaContrato}`,
        {
          headers: {
            Authorization: `Bearer ${token}`, // Agregar el token a la cabecera
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
      const response = await fetch("api/paymentRoutes/realizar-pago", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cantidadTotal,
          cuentaContrato,
          user,
        }),
      });

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
    } catch (error) {
      console.error(error);
      setAlertInfo({
        variant: "danger",
        message: "Ocurrió un error al realizar el pago.",
      });
    }

    //Si todo esta bien se reestablecen los campos
    setAlertInfo(null);
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

  const handlePrint = () => {
    const printContent = `
    Cuenta Contrato: ${cuentaContrato}
    Nombre del Cliente: ${cliente.name}
    Dirección: ${direccion}
    Cantidad Pagada: ${paymentData.amount} $
  `;

    const printWindow = window.open("", "_blank");
    printWindow.document.open();
    printWindow.document.write(`
    <pre>${printContent}</pre>
    <style>
      @media print {
        body {
          margin: 0;
          padding: 0;
        }
        
        pre {
          margin-left: 24%;
          font-size: 12px;
          white-space: pre-wrap;
        }
      }
    </style>
    <script>
      window.onload = function() {
        window.print();
        window.onafterprint = function() {
          window.close();
        };
      };
    </script>
  `);
    printWindow.document.close();
  };

  return (
    <Container className="py-4 border" style={{ maxWidth: "800px" }}>
      <h1>Realizar Pago</h1>
      <p>
        <strong>Fecha y Hora Actual: </strong>
        {currentDateTime.toLocaleString()}
      </p>
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
          <Button variant="outline-success" onClick={handlePrint}>
            Imprimir Comprobante
          </Button>
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
