import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";

import {
  acceptAgreement,
  fetchActiveAgreement,
  fetchMe,
  googleAuth,
  logoutUser,
  loginUser,
  registerUser,
  silentRefresh,
} from "../api/auth";
import { setAuthToken } from "../api/client";
import { parseAuthError } from "../utils/parseAuthError";

const AuthContext = createContext(null);

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
    setAuthStatus({ loading: true, error: "" });
    try {
      // Restore session via the httpOnly refresh cookie (no localStorage needed).
      const refreshData = await silentRefresh();
      setAuthToken(refreshData.access);
      const profile = await fetchMe();
      setUser(profile);
      setAuthStatus({ loading: false, error: "" });
    } catch {
      // No valid cookie → user is simply not logged in. Not an error.
      setAuthStatus({ loading: false, error: "" });
    }
  }, []);

  useEffect(() => {
    loadAgreement();
    loadUser();
  }, [loadAgreement, loadUser]);

  const login = useCallback(async (credentials) => {
    setAuthStatus({ loading: true, error: "" });
    try {
      const data = await loginUser(credentials);
      // Refresh token is now in httpOnly cookie set by the server.
      // Access token is in-memory only — never touches localStorage.
      setAuthToken(data.access);
      const profile = await fetchMe();
      setUser(profile);
      setAuthStatus({ loading: false, error: "" });
      return { ok: true };
    } catch (error) {
      setAuthStatus({ loading: false, error: "" });
      return { ok: false, error: parseAuthError(error) };
    }
  }, []);

  const register = useCallback(async (payload) => {
    setAuthStatus({ loading: true, error: "" });
    try {
      const data = await registerUser(payload);
      setAuthStatus({ loading: false, error: "" });
      return {
        ok: true,
        verificationRequired: data?.verification_required === true,
        email: data?.email || "",
      };
    } catch (error) {
      setAuthStatus({ loading: false, error: "" });
      return { ok: false, error: parseAuthError(error) };
    }
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    setAuthStatus({ loading: true, error: "" });
    try {
      const data = await googleAuth(credential);
      setAuthToken(data.access);
      const profile = await fetchMe();
      setUser(profile);
      setAuthStatus({ loading: false, error: "" });
      return { ok: true };
    } catch (error) {
      setAuthStatus({ loading: false, error: "" });
      return { ok: false, error: parseAuthError(error) };
    }
  }, []);

  const logout = useCallback(() => {
    // Fire-and-forget: blacklist the refresh cookie on the server.
    logoutUser().catch(() => {});
    setAuthToken(null);
    setUser(null);
  }, []);

  const acceptActiveAgreement = useCallback(async () => {
    try {
      await acceptAgreement();
      const profile = await fetchMe();
      setUser(profile);
      return { ok: true };
    } catch (error) {
      return { ok: false };
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      agreement,
      agreementStatus,
      authStatus,
      login,
      loginWithGoogle,
      register,
      logout,
      acceptActiveAgreement,
    }),
    [user, agreement, agreementStatus, authStatus, login, loginWithGoogle, register, logout, acceptActiveAgreement]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
