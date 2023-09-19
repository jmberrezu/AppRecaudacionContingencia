import React from "react";
import sparkPayLogo from "./images/logoCh.svg";
import { Alert, Container } from "react-bootstrap";

function NotFound() {
  return (
    // Contenedor Centrado con bootstrap que muestre el logo y el mensaje de error
    <Container
      style={{
        width: "900px",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div className="text-center">
        <Alert variant="light" className="mt-4">
          <img src={sparkPayLogo} alt="SparkPay" width="200" />
          <Alert.Heading>
            <h1 className="mt-4">Error 404</h1>
          </Alert.Heading>
          <hr />
          <h2>La página que buscas no existe.</h2>
        </Alert>
      </div>
    </Container>
  );
}

export default NotFound;
