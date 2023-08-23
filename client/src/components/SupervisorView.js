import React from "react";
import UserCrud from "./UserCrud";
import VirtualCashPointCrud from "./VirtualCashPointCrud";
import { Container } from "react-bootstrap";

function SupervisorView() {
  return (
    <Container>
      <UserCrud />
      <VirtualCashPointCrud />
    </Container>
  );
}

export default SupervisorView;
