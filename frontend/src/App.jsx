import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { AnalysisProvider } from "./context/AnalysisContext";
import { I18nProvider } from "./context/I18nContext";
import { ThemeProvider } from "./context/ThemeContext";
import { UIProvider } from "./context/UIContext";
import AppLayout from "./layouts/AppLayout";
import Home from "./pages/Home";
import CountryAnalysisPage from "./pages/CountryAnalysisPage";
import IncomeAnalysisPage from "./pages/IncomeAnalysisPage";
import ForecastPage from "./pages/Forecast";
import SavedPage from "./pages/Saved";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

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
                    <Route path="/compare" element={<CountryAnalysisPage />} />
                    <Route path="/analysis" element={<Navigate to="/income-analysis" replace />} />
                    <Route path="/income-analysis" element={<IncomeAnalysisPage />} />
                    <Route path="/forecast" element={<ForecastPage />} />
                    <Route path="/saved" element={<SavedPage />} />
                    <Route path="/verify-email" element={<VerifyEmailPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
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
