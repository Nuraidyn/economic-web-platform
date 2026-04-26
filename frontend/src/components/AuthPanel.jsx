import React, { useCallback, useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { resendVerification } from "../api/auth";
import AuthContext from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";
import { assessPasswordStrength } from "../utils/passwordStrength";
import GoogleLoginButton from "./GoogleLoginButton";

const REDIRECT_KEY = "ewp_redirect";

/* ── inline SVG icons (no library) ───────────────────────── */

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ── verification prompt ─────────────────────────────────── */

function VerificationPrompt({ email, t, onBack }) {
  const [resendState, setResendState] = useState("idle"); // idle | sending | sent | error

  const handleResend = async () => {
    setResendState("sending");
    try {
      await resendVerification(email ? { email } : {});
      setResendState("sent");
    } catch {
      setResendState("error");
    }
  };

  const subtitle = email
    ? t("auth.verify.subtitle", { email })
    : t("auth.verify.subtitleNoEmail");

  return (
    <div className="space-y-3 mt-4">
      <h4 className="text-sm font-medium">{t("auth.verify.title")}</h4>
      <p className="text-xs text-muted">{subtitle}</p>
      <button
        type="button"
        className="btn-secondary"
        onClick={handleResend}
        disabled={resendState === "sending" || resendState === "sent"}
      >
        {resendState === "sending"
          ? t("auth.processing")
          : resendState === "sent"
            ? t("auth.verify.resendSent")
            : t("auth.verify.resend")}
      </button>
      {resendState === "error" && (
        <p className="text-xs text-rose-300">{t("auth.verify.resendError")}</p>
      )}
      <button
        type="button"
        className="text-xs text-muted hover:text-primary block"
        onClick={onBack}
      >
        {t("auth.verify.backToLogin")}
      </button>
    </div>
  );
}

/* ── password strength meter ─────────────────────────────── */

const STRENGTH_COLORS = {
  weak: "bg-rose-500",
  medium: "bg-amber-400",
  strong: "bg-emerald-500",
};
const STRENGTH_WIDTHS = {
  weak: "w-1/3",
  medium: "w-2/3",
  strong: "w-full",
};

export function PasswordStrengthMeter({ password, t }) {
  if (!password) return null;
  const { level } = assessPasswordStrength(password);
  return (
    <div aria-live="polite" aria-atomic="true">
      <div className="h-1 w-full rounded overflow-hidden bg-surface-2">
        <div
          className={`h-full rounded transition-all duration-300 ${STRENGTH_COLORS[level]} ${STRENGTH_WIDTHS[level]}`}
        />
      </div>
      <p className="text-xs text-muted mt-1">
        {t(`auth.passwordStrength.${level}`)}
      </p>
    </div>
  );
}

/* ── password field with show/hide toggle ────────────────── */

function PasswordInput({ name, value, onChange, required, t, show, onToggle, id }) {
  return (
    <div className="relative">
      <input
        id={id}
        className="input pr-8 w-full"
        type={show ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={name === "password" ? "current-password" : "new-password"}
      />
      <button
        type="button"
        aria-label={show ? t("auth.hidePassword") : t("auth.showPassword")}
        onClick={onToggle}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-primary focus:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
        tabIndex={0}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

/* ── main component ──────────────────────────────────────── */

export default function AuthPanel({ onAuthSuccess }) {
  const { user, authStatus, login, loginWithGoogle, register, logout, agreement } = useContext(AuthContext);
  const { t } = useI18n();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [googleError, setGoogleError] = useState("");
  const [formState, setFormState] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptAgreement: false,
  });
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // verifyMode = null | { email: string } — show verification prompt
  const [verifyMode, setVerifyMode] = useState(null);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const switchMode = (next) => {
    setMode(next);
    setMessage("");
    setGoogleError("");
    setVerifyMode(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleGoogleSuccess = useCallback(async (credential) => {
    setGoogleError("");
    const result = await loginWithGoogle(credential);
    if (!result.ok) {
      setGoogleError(t(result.error?.msgKey ?? "auth.googleError"));
    } else {
      onAuthSuccess?.();
      const redirect = sessionStorage.getItem(REDIRECT_KEY);
      if (redirect) {
        sessionStorage.removeItem(REDIRECT_KEY);
        navigate(redirect, { replace: true });
      }
    }
  }, [loginWithGoogle, onAuthSuccess, navigate, t]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (mode === "login") {
      const result = await login({
        username: formState.username,
        password: formState.password,
      });
      if (!result.ok) {
        if (result.error?.code === "email_not_verified") {
          setVerifyMode({ email: result.error.email || formState.email });
          return;
        }
        const base = t(result.error?.msgKey ?? "auth.errorUnknown");
        const detail = result.error?.detail;
        setMessage(detail ? `${base} ${detail}` : base);
      } else {
        onAuthSuccess?.();
        const redirect = sessionStorage.getItem(REDIRECT_KEY);
        if (redirect) {
          sessionStorage.removeItem(REDIRECT_KEY);
          navigate(redirect, { replace: true });
        }
      }
    } else {
      // Frontend validation before hitting the backend
      if (formState.password.length < 8) {
        setMessage(t("auth.passwordTooShort"));
        return;
      }
      if (formState.password !== formState.confirmPassword) {
        setMessage(t("auth.passwordsDoNotMatch"));
        return;
      }
      const result = await register({
        username: formState.username,
        email: formState.email,
        password: formState.password,
        accept_agreement: formState.acceptAgreement,
      });
      if (!result.ok) {
        const base = t(result.error?.msgKey ?? "auth.errorUnknown");
        const detail = result.error?.detail;
        setMessage(detail ? `${base} ${detail}` : base);
      } else if (result.verificationRequired) {
        setVerifyMode({ email: result.email });
      } else {
        setMessage(t("auth.registrationSuccess"));
        setMode("login");
      }
    }
  };

  if (user) {
    return (
      <div className="panel">
        <h3 className="panel-title">{t("auth.session")}</h3>
        <div className="space-y-2 text-sm text-muted">
          <p>{t("auth.signedInAs", { username: user.username })}</p>
          <p className="uppercase tracking-[0.2em] text-xs text-faint">{user.role}</p>
          <button
            className="btn-secondary"
            type="button"
            onClick={() => {
              logout();
              onAuthSuccess?.();
            }}
          >
            {t("auth.signOut")}
          </button>
        </div>
      </div>
    );
  }

  if (verifyMode) {
    return (
      <div className="panel">
        <h3 className="panel-title">{t("auth.access")}</h3>
        <VerificationPrompt
          email={verifyMode.email}
          t={t}
          onBack={() => switchMode("login")}
        />
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="flex items-center justify-between">
        <h3 className="panel-title">{t("auth.access")}</h3>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={mode === "login" ? "tab-active" : "tab"}
          >
            {t("auth.login")}
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={mode === "register" ? "tab-active" : "tab"}
          >
            {t("auth.register")}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 mt-4">
        <label className="label" htmlFor="auth-username">{t("auth.username")}</label>
        <input
          id="auth-username"
          className="input"
          name="username"
          value={formState.username}
          onChange={handleChange}
          required
          autoComplete="username"
        />

        {mode === "register" && (
          <>
            <label className="label" htmlFor="auth-email">{t("auth.email")}</label>
            <input
              id="auth-email"
              className="input"
              type="email"
              name="email"
              value={formState.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </>
        )}

        <label className="label" htmlFor="auth-password">{t("auth.password")}</label>
        <PasswordInput
          id="auth-password"
          name="password"
          value={formState.password}
          onChange={handleChange}
          required
          t={t}
          show={showPassword}
          onToggle={() => setShowPassword((v) => !v)}
        />

        {mode === "register" && (
          <PasswordStrengthMeter password={formState.password} t={t} />
        )}

        {mode === "login" && (
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-muted hover:text-primary">
              {t("auth.forgotPassword")}
            </Link>
          </div>
        )}

        {mode === "register" && (
          <>
            <label className="label" htmlFor="auth-confirm-password">{t("auth.confirmPassword")}</label>
            <PasswordInput
              id="auth-confirm-password"
              name="confirmPassword"
              value={formState.confirmPassword}
              onChange={handleChange}
              required
              t={t}
              show={showConfirmPassword}
              onToggle={() => setShowConfirmPassword((v) => !v)}
            />
          </>
        )}

        {mode === "register" && agreement && (
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              name="acceptAgreement"
              checked={formState.acceptAgreement}
              onChange={handleChange}
            />
            {t("auth.agreeTo", { title: agreement.title })}
          </label>
        )}

        <button className="btn-primary" type="submit" disabled={authStatus.loading}>
          {authStatus.loading
            ? t("auth.processing")
            : mode === "login"
              ? t("auth.signIn")
              : t("auth.createAccount")}
        </button>

        {authStatus.error === "Session expired." && (
          <p className="text-xs text-rose-200/90">{t("auth.sessionExpired")}</p>
        )}
        {message && (
          <p className="text-xs text-rose-200/90">{message}</p>
        )}
      </form>

      <div className="relative flex items-center my-3">
        <div className="flex-grow border-t border-surface-2" />
        <span className="mx-3 text-xs text-faint select-none">{t("auth.orDivider")}</span>
        <div className="flex-grow border-t border-surface-2" />
      </div>

      <GoogleLoginButton
        onSuccess={handleGoogleSuccess}
        onError={() => setGoogleError(t("auth.googleError"))}
      />
      {googleError && (
        <p className="text-xs text-rose-200/90 mt-2">{googleError}</p>
      )}
    </div>
  );
}
