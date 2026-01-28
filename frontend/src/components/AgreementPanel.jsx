import React, { useContext, useState } from "react";

import AuthContext from "../context/AuthContext";

export default function AgreementPanel() {
  const { agreement, agreementStatus, user, acceptActiveAgreement } = useContext(AuthContext);
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
        <h3 className="panel-title">User Agreement</h3>
        <p className="text-xs text-slate-200/70">Loading agreement...</p>
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="panel">
        <h3 className="panel-title">User Agreement</h3>
        <p className="text-xs text-slate-200/70">No active agreement published.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3 className="panel-title">User Agreement</h3>
      <div className="text-xs text-slate-200/80 space-y-3">
        <p className="uppercase tracking-[0.2em] text-slate-300/60">Version {agreement.version}</p>
        <p className="leading-relaxed max-h-28 overflow-y-auto pr-2">
          {agreement.content}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-300/70">
            Agreement required for forecasts and advanced analytics.
          </span>
          <button
            className="btn-secondary"
            type="button"
            disabled={!user || user.agreement_accepted || accepted}
            onClick={handleAccept}
          >
            {user?.agreement_accepted || accepted ? "Accepted" : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
