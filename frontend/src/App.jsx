import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { AnalysisProvider } from "./context/AnalysisContext";
import AppLayout from "./layouts/AppLayout";
import Home from "./pages/Home";
import ForecastPage from "./pages/Forecast";
import InequalityPage from "./pages/Inequality";
import SavedPage from "./pages/Saved";

export default function App() {
  return (
    <AuthProvider>
      <AnalysisProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/inequality" element={<InequalityPage />} />
              <Route path="/forecast" element={<ForecastPage />} />
              <Route path="/saved" element={<SavedPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AnalysisProvider>
    </AuthProvider>
  );
}
