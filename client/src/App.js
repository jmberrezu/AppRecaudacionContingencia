import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SupervisorView from "./components/SupervisorView";
import Login from "./components/Login";
import Recaudation from "./components/RecaudationPage/Recaudation";
import AdminLogin from "./components/AdminLogin";
import SupevisorCrud from "./components/SupervisorCrud";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/supervisor" element={<SupervisorView />} />
        <Route path="/recaudation" element={<Recaudation />} />
        <Route path="/supervisorcrud" element={<SupevisorCrud />} />
        <Route path="/admin" element={<AdminLogin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
