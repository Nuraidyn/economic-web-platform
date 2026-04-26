import React, { useState } from "react";
import { Link } from "react-router-dom";

import { forgotPassword } from "../api/auth";
import { useI18n } from "../context/I18nContext";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | sent
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("submitting");
    try {
      await forgotPassword(email);
    } catch {
      // Always show "sent" — don't leak whether the email exists
    }
    setStatus("sent");
  };

  return (
    <div className="panel max-w-md mx-auto mt-16 space-y-4">
      <h2 className="panel-title">{t("forgot.title")}</h2>

      {status === "sent" ? (
        <>
          <p className="text-sm text-muted">{t("forgot.sent")}</p>
          <Link to="/" className="text-xs text-muted hover:text-primary block">
            {t("resetPwd.backToLogin")}
          </Link>
        </>
      ) : (
        <>
          <p className="text-xs text-muted">{t("forgot.subtitle")}</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="label" htmlFor="forgot-email">{t("forgot.emailLabel")}</label>
            <input
              id="forgot-email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            {error && <p className="text-xs text-rose-300">{error}</p>}
            <button className="btn-primary" type="submit" disabled={status === "submitting"}>
              {status === "submitting" ? t("auth.processing") : t("forgot.submit")}
            </button>
          </form>
          <Link to="/" className="text-xs text-muted hover:text-primary block">
            {t("resetPwd.backToLogin")}
          </Link>
        </>
      )}
    </div>
  );
}
