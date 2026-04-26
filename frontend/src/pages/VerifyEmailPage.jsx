import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { resendVerification, verifyEmail } from "../api/auth";
import { useI18n } from "../context/I18nContext";

const ERROR_KEYS = {
  expired: "verifyPage.expired",
  already_used: "verifyPage.used",
  invalid: "verifyPage.invalid",
};

export default function VerifyEmailPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [errorCode, setErrorCode] = useState(null);
  const [resendState, setResendState] = useState("idle"); // idle | sending | sent | error
  const [email, setEmail] = useState("");
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token || calledRef.current) return;
    calledRef.current = true;

    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        const code = err?.response?.data?.code || "invalid";
        setErrorCode(code);
        setStatus("error");
      });
  }, [token]);

  const handleResend = async () => {
    setResendState("sending");
    try {
      await resendVerification(email ? { email } : {});
      setResendState("sent");
    } catch {
      setResendState("error");
    }
  };

  if (!token) {
    return (
      <div className="panel max-w-md mx-auto mt-16 text-center">
        <p className="text-sm text-muted">{t("verifyPage.invalid")}</p>
        <Link to="/" className="btn-secondary mt-4 inline-block">{t("verifyPage.signIn")}</Link>
      </div>
    );
  }

  return (
    <div className="panel max-w-md mx-auto mt-16 space-y-4">
      {status === "verifying" && (
        <p className="text-sm text-muted animate-pulse">{t("verifyPage.verifying")}</p>
      )}

      {status === "success" && (
        <>
          <div className="text-emerald-400 text-2xl">✓</div>
          <p className="text-sm">{t("verifyPage.success")}</p>
          <Link to="/" className="btn-primary inline-block">{t("verifyPage.signIn")}</Link>
        </>
      )}

      {status === "error" && (
        <>
          <p className="text-sm text-rose-300">
            {t(ERROR_KEYS[errorCode] || "verifyPage.invalid")}
          </p>

          {(errorCode === "expired" || errorCode === "invalid") && (
            <div className="space-y-2">
              <input
                className="input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
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
            </div>
          )}

          <Link to="/" className="text-xs text-muted hover:text-primary block">
            {t("auth.verify.backToLogin")}
          </Link>
        </>
      )}
    </div>
  );
}
