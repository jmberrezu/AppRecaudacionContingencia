import axios from "axios";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Table, Button, Modal } from "react-bootstrap";

function CashCloseHistory({ user }) {
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [cashClose, setCashClose] = useState([]);
  const [selectedCashClose, setSelectedCashClose] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Obtener el token del local storage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      axios
        .get("http://localhost:5000/api/login/verify", {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
        .then((response) => {
          // Verificar el rol ya sea cajero o gerente
          if (
            response.data.role !== "cajero" &&
            response.data.role !== "gerente"
          ) {
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

  // Funcion para obtener la lista de cierres de caja
  const getCashCloseHistory = useCallback(async () => {
    if (user.idcashpoint)
      try {
        const response = await fetch(
          `http://localhost:5000/api/cashClose/closedcashwithpayments/${user.idcashpoint}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.ok) {
          const cashCloseData = await response.json();
          setCashClose(cashCloseData);
        }
      } catch (error) {
        console.error(error);
      }
  }, [token, user.idcashpoint]);

  // Obtener la lista de cierres de caja
  useEffect(() => {
    if (token) {
      getCashCloseHistory();
    }
  }, [token, user.idcashpoint, getCashCloseHistory]);

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "numeric", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Function to show the modal with payment details
  const showPaymentDetails = (cashCloseItem) => {
    setSelectedCashClose(cashCloseItem);
    setShowModal(true);
  };

  // Render a "Ver Pagos" button for each cash close item
  const renderCashCloseItems = () => {
    return cashClose.map((cashCloseItem) => (
      <div key={cashCloseItem.cashpointpaymentgroupreferenceid}>
        <h5>Grupo: {cashCloseItem.cashpointpaymentgroupreferenceid}</h5>
        <Table bordered responsive>
          <thead>
            <tr>
              <th>Fecha de Cierre de Caja</th>
              <th>Monto Cerrado</th>
              <th>Caja</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{formatDate(cashCloseItem.valuedate)}</td>
              <td
                className={
                  parseFloat(cashCloseItem.closingdoccumentamount) ===
                  parseFloat(cashCloseItem.realclosingdoccumentamount)
                    ? "text-success"
                    : "text-danger"
                }
              >
                {"$" +
                  parseFloat(cashCloseItem.closingdoccumentamount).toFixed(2)}
                {parseFloat(cashCloseItem.closingdoccumentamount) !==
                  parseFloat(cashCloseItem.realclosingdoccumentamount) &&
                  ` (Existe diferencia: ${
                    (parseFloat(cashCloseItem.closingdoccumentamount) -
                      parseFloat(cashCloseItem.realclosingdoccumentamount) >
                    0
                      ? "+"
                      : "") +
                    (
                      parseFloat(cashCloseItem.closingdoccumentamount) -
                      parseFloat(cashCloseItem.realclosingdoccumentamount)
                    ).toFixed(2)
                  }$ )`}
              </td>
              <td>{cashCloseItem.virtualcashpointname}</td>
            </tr>
          </tbody>
        </Table>
        <Button
          onClick={() => showPaymentDetails(cashCloseItem)}
          variant="primary"
        >
          Ver Pagos
        </Button>
        <hr />
      </div>
    ));
  };

  return (
    <Container className="py-4">
      <h1> Historial de Cierres de Caja </h1>
      <div className="p-4" style={{ height: "75vh", overflowY: "auto" }}>
        {renderCashCloseItems()}
      </div>

      {/* Modal for payment details */}
      <Modal
        className="modal-xl"
        show={showModal}
        onHide={() => setShowModal(false)}
      >
        <Modal.Header closeButton>
          <Modal.Title>Detalles de Pagos</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCashClose && (
            <Table bordered responsive className="table-sm">
              <thead>
                <tr>
                  <th>PID</th>
                  <th>Cuenta Contrato</th>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Caja</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {selectedCashClose.pagos.map((cashpointpayment) => (
                  <tr key={cashpointpayment.paymenttransactionid}>
                    <td>{cashpointpayment.paymenttransactionid}</td>
                    <td>{cashpointpayment.payercontractaccountid}</td>
                    <td>{formatDate(cashpointpayment.valuedate)}</td>
                    <td>{"$" + cashpointpayment.paymentamountcurrencycode}</td>
                    <td>{cashpointpayment.virtualcashpointname}</td>
                    <td>{cashpointpayment.username}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default CashCloseHistory;
