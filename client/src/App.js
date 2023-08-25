import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SupervisorView from "./components/SupervisorPage/SupervisorView";
import Login from "./components/RecaudationPage/Login";
import Recaudation from "./components/RecaudationPage/Recaudation";
import AdminLogin from "./components/AdminPage/AdminLogin";
import SupevisorCrud from "./components/AdminPage/SupervisorCrud";
import SupervisorLogin from "./components/SupervisorPage/SupervisorLogin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/supervisorview" element={<SupervisorView />} />
        <Route path="/recaudation" element={<Recaudation />} />
        <Route path="/supervisorcrud" element={<SupevisorCrud />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/supervisor" element={<SupervisorLogin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
