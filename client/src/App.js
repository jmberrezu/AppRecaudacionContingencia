import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SupervisorView from "./components/SupervisorView";
import Login from "./components/Login";
import Recaudation from "./components/RecaudationPage/Recaudation";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/supervisor" element={<SupervisorView />} />
        <Route path="/recaudation" element={<Recaudation />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
