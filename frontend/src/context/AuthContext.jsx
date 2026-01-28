import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

import {
  acceptAgreement,
  fetchActiveAgreement,
  fetchMe,
  loginUser,
  registerUser,
} from "../api/auth";
import { setAuthToken } from "../api/client";

const AuthContext = createContext(null);

const TOKEN_KEY = "ewp_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [agreement, setAgreement] = useState(null);
  const [agreementStatus, setAgreementStatus] = useState({ loading: true, error: "" });
  const [authStatus, setAuthStatus] = useState({ loading: true, error: "" });

  const loadAgreement = useCallback(async () => {
    setAgreementStatus({ loading: true, error: "" });
    try {
      const data = await fetchActiveAgreement();
      setAgreement(data);
      setAgreementStatus({ loading: false, error: "" });
    } catch (error) {
      setAgreement(null);
      setAgreementStatus({ loading: false, error: "Agreement unavailable." });
    }
  }, []);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setAuthStatus({ loading: false, error: "" });
      return;
    }
    setAuthToken(token);
    try {
      const data = await fetchMe();
      setUser(data);
      setAuthStatus({ loading: false, error: "" });
    } catch (error) {
      setAuthToken(null);
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setAuthStatus({ loading: false, error: "Session expired." });
    }
  }, []);

  useEffect(() => {
    loadAgreement();
    loadUser();
  }, [loadAgreement, loadUser]);

  const login = async (credentials) => {
    setAuthStatus({ loading: true, error: "" });
    try {
      const data = await loginUser(credentials);
      localStorage.setItem(TOKEN_KEY, data.access);
      setAuthToken(data.access);
      const profile = await fetchMe();
      setUser(profile);
      setAuthStatus({ loading: false, error: "" });
      return { ok: true };
    } catch (error) {
      setAuthStatus({ loading: false, error: "Invalid credentials." });
      return { ok: false };
    }
  };

  const register = async (payload) => {
    setAuthStatus({ loading: true, error: "" });
    try {
      await registerUser(payload);
      setAuthStatus({ loading: false, error: "" });
      return { ok: true };
    } catch (error) {
      setAuthStatus({ loading: false, error: "Registration failed." });
      return { ok: false };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
  };

  const acceptActiveAgreement = async () => {
    try {
      await acceptAgreement();
      const profile = await fetchMe();
      setUser(profile);
      return { ok: true };
    } catch (error) {
      return { ok: false };
    }
  };

  const value = useMemo(
    () => ({
      user,
      agreement,
      agreementStatus,
      authStatus,
      login,
      register,
      logout,
      acceptActiveAgreement,
    }),
    [user, agreement, agreementStatus, authStatus, login, register, logout, acceptActiveAgreement]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
