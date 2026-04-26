import React, { useEffect, useRef } from "react";

const SCRIPT_ID = "google-gsi-script";
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function loadGISScript(onLoad) {
  // Already loaded (covers test environment where window.google is mocked)
  if (window.google?.accounts) {
    onLoad();
    return;
  }
  if (document.getElementById(SCRIPT_ID)) {
    document.getElementById(SCRIPT_ID).addEventListener("load", onLoad);
    return;
  }
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.src = SCRIPT_SRC;
  script.async = true;
  script.defer = true;
  script.onload = onLoad;
  document.head.appendChild(script);
}

export default function GoogleLoginButton({ onSuccess, onError }) {
  const containerRef = useRef(null);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId) return;

    loadGISScript(() => {
      if (!window.google?.accounts?.id || !containerRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential, error }) => {
          if (error || !credential) {
            onError?.(error || "no_credential");
            return;
          }
          onSuccess(credential);
        },
      });

      window.google.accounts.id.renderButton(containerRef.current, {
        theme: "outline",
        size: "large",
        width: containerRef.current.offsetWidth || 320,
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
      });
    });
  }, [clientId, onSuccess, onError]);

  if (!clientId) return null;

  return <div ref={containerRef} className="w-full" data-testid="google-button-container" />;
}
