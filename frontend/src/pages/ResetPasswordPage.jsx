import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { resetPassword } from "../api/auth";
import { PasswordStrengthMeter } from "../components/AuthPanel";
import { useI18n } from "../context/I18nContext";

const ERROR_KEYS = {
  expired: "resetPwd.expired",
  already_used: "resetPwd.used",
  invalid: "resetPwd.invalid",
  weak_password: "resetPwd.invalid",
};

export default function ResetPasswordPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorCode, setErrorCode] = useState(null);
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");

    if (password.length < 8) {
      setLocalError(t("auth.passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setLocalError(t("resetPwd.passwordsDoNotMatch"));
      return;
    }

    setStatus("submitting");
    try {
      await resetPassword(token, password);
      setStatus("success");
    } catch (err) {
      const code = err?.response?.data?.code || "invalid";
      setErrorCode(code);
      setStatus("error");
    }
  };

  if (!token) {
    return (
      <div className="panel max-w-md mx-auto mt-16 space-y-4">
        <p className="text-sm text-rose-300">{t("resetPwd.invalid")}</p>
        <Link to="/" className="text-xs text-muted hover:text-primary block">
          {t("resetPwd.backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className="panel max-w-md mx-auto mt-16 space-y-4">
      <h2 className="panel-title">{t("resetPwd.title")}</h2>

      {status === "success" && (
        <>
          <div className="text-emerald-400 text-2xl">✓</div>
          <p className="text-sm">{t("resetPwd.success")}</p>
          <Link to="/" className="btn-primary inline-block">{t("verifyPage.signIn")}</Link>
        </>
      )}

      {status === "error" && (
        <>
          <p className="text-sm text-rose-300">
            {t(ERROR_KEYS[errorCode] || "resetPwd.invalid")}
          </p>
          {(errorCode === "expired" || errorCode === "invalid") && (
            <Link to="/forgot-password" className="btn-secondary inline-block">
              {t("resetPwd.requestNew")}
            </Link>
          )}
          <Link to="/" className="text-xs text-muted hover:text-primary block">
            {t("resetPwd.backToLogin")}
          </Link>
        </>
      )}

      {(status === "idle" || status === "submitting") && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="label" htmlFor="reset-password">{t("resetPwd.newPassword")}</label>
          <input
            id="reset-password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <PasswordStrengthMeter password={password} t={t} />

          <label className="label" htmlFor="reset-confirm">{t("resetPwd.confirmPassword")}</label>
          <input
            id="reset-confirm"
            className="input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />

          {localError && <p className="text-xs text-rose-300">{localError}</p>}

          <button className="btn-primary" type="submit" disabled={status === "submitting"}>
            {status === "submitting" ? t("auth.processing") : t("resetPwd.submit")}
          </button>
          <Link to="/" className="text-xs text-muted hover:text-primary block">
            {t("resetPwd.backToLogin")}
          </Link>
        </form>
      )}
    </div>
  );
}
