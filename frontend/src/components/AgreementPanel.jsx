import React, { useContext, useState } from "react";

import AuthContext from "../context/AuthContext";
import { useI18n } from "../context/I18nContext";

export default function AgreementPanel() {
  const { agreement, agreementStatus, user, acceptActiveAgreement } = useContext(AuthContext);
  const { t } = useI18n();
  const [accepted, setAccepted] = useState(false);

  const handleAccept = async () => {
    const result = await acceptActiveAgreement();
    if (result.ok) {
      setAccepted(true);
    }
  };

  if (agreementStatus.loading) {
    return (
      <div className="panel">
        <h3 className="panel-title">{t("agreement.title")}</h3>
        <p className="text-xs text-muted">{t("agreement.loading")}</p>
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="panel">
        <h3 className="panel-title">{t("agreement.title")}</h3>
        <p className="text-xs text-muted">{t("agreement.none")}</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3 className="panel-title">{t("agreement.title")}</h3>
      <div className="text-xs text-muted space-y-3">
        <p className="uppercase tracking-[0.2em] text-faint">{t("agreement.version", { version: agreement.version })}</p>
        <p className="leading-relaxed max-h-28 overflow-y-auto pr-2">
          {agreement.content}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-faint">
            {t("agreement.required")}
          </span>
          <button
            className="btn-secondary"
            type="button"
            disabled={!user || user.agreement_accepted || accepted}
            onClick={handleAccept}
          >
            {user?.agreement_accepted || accepted ? t("agreement.accepted") : t("agreement.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
