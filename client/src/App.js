import React from "react";
import UserCrud from "./components/UserCrud";
import VirtualCashPointCrud from "./components/VirtualCashPointCrud";
import { Container } from "react-bootstrap";

function App() {
  return (
    <Container>
      <UserCrud />
      <VirtualCashPointCrud />
    </Container>
  );
}

export default App;
