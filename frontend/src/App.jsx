import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { AnalysisProvider } from "./context/AnalysisContext";
import { I18nProvider } from "./context/I18nContext";
import { ThemeProvider } from "./context/ThemeContext";
import { UIProvider } from "./context/UIContext";
import AppLayout from "./layouts/AppLayout";
import Home from "./pages/Home";
import AnalysisPage from "./pages/Analysis";
import ForecastPage from "./pages/Forecast";
import SavedPage from "./pages/Saved";

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <AuthProvider>
          <UIProvider>
            <AnalysisProvider>
              <BrowserRouter>
                <Routes>
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/analysis" element={<AnalysisPage />} />
                    <Route path="/forecast" element={<ForecastPage />} />
                    <Route path="/saved" element={<SavedPage />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </AnalysisProvider>
          </UIProvider>
        </AuthProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
