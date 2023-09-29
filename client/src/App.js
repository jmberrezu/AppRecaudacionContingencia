import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SupervisorView from "./components/SupervisorPage/SupervisorView";
import Login from "./components/RecaudationPage/Login";
import Recaudation from "./components/RecaudationPage/Recaudation";
import SupevisorCrud from "./components/AdminPage/SupervisorCrud";
import NotFound from "./NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/supervisorview" element={<SupervisorView />} />
        <Route path="/recaudation" element={<Recaudation />} />
        <Route path="/supervisorcrud" element={<SupevisorCrud />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
