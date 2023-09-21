import React, { useState, useEffect } from "react";
import {
  Alert,
  Container,
  Form,
  Button,
  InputGroup,
  Modal,
  Table,
} from "react-bootstrap";
import { WalletFill } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useCallback } from "react";

function CashClose({ user }) {
  const navigate = useNavigate();
  const [token, setToken] = useState("");

  const [dolares, setDolares] = useState(""); // Initialize with a default value
  const [centavos, setCentavos] = useState(""); // Initialize with a default value
  // Estado para mostrar alertas
  const [alertInfo, setAlertInfo] = useState(null);
  const [grupo, setGrupo] = useState("");
  const [showDifferenceModal, setShowDifferenceModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [diferencia, setDiferencia] = useState("");
  const [totalPagos, setTotalPagos] = useState("");
  const [totalMonto, setTotalMonto] = useState("");
  const [noPagos, setNoPagos] = useState("");

  // Obtengo el token del local storage
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

  // Función para obtener el grupo de pago
  const getGrupo = useCallback(async () => {
    setAlertInfo(null);
    setNoPagos(false);
    try {
      const response = await fetch("http://localhost:5000/api/cashClose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idcashpoint: user.idcashpoint,
          idvirtualcashpoint: user.idvirtualcashpoint,
        }),
      });

      const data = await response.json();

      // Si se trata de cerrar caja y todavia no se ha recibido ningun pago, se muestra una alerta de que no se puede cerrar caja
      if (
        response.status === 404 &&
        data.error ===
          "It is not possible to close the cash register if no payment has been made."
      ) {
        setAlertInfo({
          variant: "danger",
          message: "No se puede cerrar caja si no se ha recibido ningun pago.",
        });
        //Desactivar el boton de cerrar caja
        setNoPagos(true);
        return;
      }

      // Si el grupo de pago tiene fecha del dia siguiente
      if (response.status === 400) {
        setAlertInfo({
          variant: "danger",
          message: data.error,
        });
        //Desactivar el boton de cerrar caja
        setNoPagos(true);
        return;
      }

      setGrupo(data);

      // Si se ha recibido alerta como true, se muestra una alerta de que se esta cerrando caja de un dia previo
      if (data.alerta) {
        setAlertInfo({
          variant: "warning",
          message:
            "Se esta cerrando caja de un dia previo: " +
            new Date(data.valuedate).toISOString().slice(0, 10),
        });
      }
    } catch (error) {
      setAlertInfo({ variant: "danger", message: error.message });
    }
  }, [token, user.idcashpoint, user.idvirtualcashpoint]);

  // Obtengo el grupo de pago
  useEffect(() => {
    if (token) {
      getGrupo();
    }
  }, [token, user.idcashpoint, getGrupo]);

  // Función para cerrar la caja
  const cerrarCaja = async () => {
    // Validar que se haya ingresado un monto
    if (dolares === "" && centavos === "") {
      setAlertInfo({
        variant: "danger",
        message: "Debe ingresar un monto para cerrar la caja.",
      });
      return;
    }

    // Llamar a la API para cerrar la caja
    try {
      const response = await fetch(
        "http://localhost:5000/api/cashClose/close",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          // Envío el grupo de pago y el monto ingresado
          body: JSON.stringify({
            grupo: grupo,
            dolares: dolares,
            centavos: centavos,
            idglobalvirtualcashpoint: user.idglobalvirtualcashpoint,
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        //Muestra un modal donde se muestra el error de diferencia, con el numero total de pagos, el total recaudado, la diferencia y un boton para cerrar el modal
        setDiferencia(
          (
            parseFloat(data.total_sumado) - parseFloat(dolares + "." + centavos)
          ).toFixed(2)
        );
        setTotalPagos(data.total_pagos);
        setTotalMonto(data.total_sumado);
        setShowDifferenceModal(true);
      }

      if (data.message) {
        setAlertInfo({ variant: "success", message: data.message });

        setTotalPagos(data.total_pagos);
        setTotalMonto(data.total_sumado);

        setShowSuccessModal(true);
      }
    } catch (error) {
      setAlertInfo({ variant: "danger", message: error.message });
    }
  };

  const anularcierre = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/cashClose/anular-cierre-caja/${grupo.cashpointpaymentgroupreferenceid}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user: user,
          }),
        }
      );

      if (response.ok) {
        await getGrupo();
      }
    } catch (error) {
      console.error(error);
    }
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
      <h1>Realizar Cierre de Caja</h1>
      {alertInfo && (
        <Alert variant={alertInfo.variant}>{alertInfo.message}</Alert>
      )}
      <InputGroup className="my-3 px-3">
        <InputGroup.Text id="group">Grupo</InputGroup.Text>
        <Form.Control
          type="text"
          value={grupo ? grupo.cashpointpaymentgroupreferenceid : ""} // Use an empty string if grupo is falsy
          disabled
        />
        <InputGroup.Text id="TotalRecaudado">Total Recaudado</InputGroup.Text>
        <Form.Control
          type="text"
          value={grupo ? "$" + grupo.total_sumado : ""} // Use an empty string if grupo is falsy
          disabled
        />
      </InputGroup>
      <Container className="d-flex justify-content-center">
        <InputGroup className="pt-4" style={{ maxWidth: "400px" }}>
          <InputGroup.Text id="formPago">Dinero Al Cerrar</InputGroup.Text>
          <Form.Control
            type="text"
            placeholder="Dólares"
            value={dolares}
            onChange={handleDolaresChange}
            disabled={noPagos ? true : false}
          />
          <InputGroup.Text id="formPago">.</InputGroup.Text>

          <Form.Control
            type="text"
            placeholder="Centavos"
            value={centavos}
            onChange={handleCentavosChange}
            disabled={noPagos ? true : false}
          />
          <InputGroup.Text id="formPago">$</InputGroup.Text>
        </InputGroup>
      </Container>

      <Container className="d-grid mt-2" style={{ maxWidth: "425px" }}>
        <Button
          variant="success"
          onClick={cerrarCaja}
          disabled={noPagos ? true : false}
        >
          Cerrar Caja <WalletFill className="ms-2" />
        </Button>
      </Container>
      <Modal
        show={showDifferenceModal}
        onHide={() => setShowDifferenceModal(false)}
        size="lg"
      >
        <Modal.Header
          closeButton
          className="bg-danger text-white"
          onClick={() => {
            setDolares("");
            setCentavos("");
            setAlertInfo("");
            setGrupo("");
            getGrupo();
          }}
        >
          <Modal.Title>Error de Diferencia</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5 className="mx-4 mb-4 mt-2 text-center">
            El monto ingresado no coincide con la suma de los pagos del grupo.
          </h5>
          <hr className="mb-5" />

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Información</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Numero total de Pagos</td>
                <td>{totalPagos}</td>
              </tr>
              <tr>
                <td>Importe de Cierre Ingresado</td>
                <td>${parseFloat(`${dolares}.${centavos}`).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Total Recaudado</td>
                <td>${parseFloat(totalMonto).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Diferencia</td>
                <td className="text-danger">
                  ${parseFloat(diferencia).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-danger"
            onClick={() => {
              anularcierre();
              setShowDifferenceModal(false);
              setDolares("");
              setCentavos("");
              setAlertInfo("");
              setGrupo("");
              getGrupo();
            }}
            className="me-auto"
          >
            Anular Cierre
          </Button>
          <Button
            variant="outline-primary"
            onClick={() => {
              setShowDifferenceModal(false);
              setDolares("");
              setCentavos("");
              setAlertInfo("");
              setGrupo("");
              getGrupo();
            }}
          >
            Aceptar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de exito */}
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)}>
        <Modal.Header
          closeButton
          className="bg-success text-white"
          onClick={() => {
            setDolares("");
            setCentavos("");
            setAlertInfo("");
            setGrupo("");
            getGrupo();
          }}
        >
          <Modal.Title>Cerrado</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5 className="mx-4 mb-4 mt-2 text-center">
            Se ha cerrado la caja con éxito.
          </h5>
          <hr className="mb-5" />
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Información</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Numero total de Pagos</td>
                <td>{totalPagos}</td>
              </tr>
              <tr>
                <td>Total Recaudado</td>
                <td>${parseFloat(`${totalMonto}`).toFixed(2)}</td>
              </tr>
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="primary"
            onClick={() => {
              setShowSuccessModal(false);
              setDolares("");
              setCentavos("");
              setAlertInfo("");
              setGrupo("");
              getGrupo();
            }}
          >
            Aceptar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default CashClose;
