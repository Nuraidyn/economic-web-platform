import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import GoogleLoginButton from "../GoogleLoginButton";

/* ── helpers ─────────────────────────────────────────────────── */

function makeGoogleMock(callbackFn) {
  return {
    accounts: {
      id: {
        initialize: vi.fn((config) => {
          callbackFn(config);
        }),
        renderButton: vi.fn(),
        prompt: vi.fn(),
      },
    },
  };
}

/* ── tests ───────────────────────────────────────────────────── */

describe("GoogleLoginButton", () => {
  let originalGoogle;
  let originalEnv;

  beforeEach(() => {
    originalGoogle = window.google;
    originalEnv = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  });

  afterEach(() => {
    window.google = originalGoogle;
    // Clean up injected script tags
    document.getElementById("google-gsi-script")?.remove();
    vi.restoreAllMocks();
  });

  it("renders nothing when VITE_GOOGLE_CLIENT_ID is not set", () => {
    // When env var is empty/undefined, component returns null
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
    const { container } = render(
      <GoogleLoginButton onSuccess={vi.fn()} onError={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders container div when client ID is configured", () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com");

    let capturedConfig = null;
    window.google = makeGoogleMock((config) => { capturedConfig = config; });

    render(<GoogleLoginButton onSuccess={vi.fn()} onError={vi.fn()} />);

    expect(screen.getByTestId("google-button-container")).toBeTruthy();
  });

  it("calls onSuccess with credential when GIS callback fires", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com");

    const onSuccess = vi.fn();
    let capturedCallback = null;

    window.google = {
      accounts: {
        id: {
          initialize: vi.fn(({ callback }) => { capturedCallback = callback; }),
          renderButton: vi.fn(),
        },
      },
    };

    render(<GoogleLoginButton onSuccess={onSuccess} onError={vi.fn()} />);

    // Simulate GIS calling our callback with a credential
    await act(async () => {
      capturedCallback?.({ credential: "fake.google.id_token" });
    });

    expect(onSuccess).toHaveBeenCalledWith("fake.google.id_token");
  });

  it("calls onError when GIS returns an error", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com");

    const onError = vi.fn();
    let capturedCallback = null;

    window.google = {
      accounts: {
        id: {
          initialize: vi.fn(({ callback }) => { capturedCallback = callback; }),
          renderButton: vi.fn(),
        },
      },
    };

    render(<GoogleLoginButton onSuccess={vi.fn()} onError={onError} />);

    await act(async () => {
      capturedCallback?.({ error: "popup_closed_by_user" });
    });

    expect(onError).toHaveBeenCalledWith("popup_closed_by_user");
  });

  it("calls onError when credential is missing from response", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com");

    const onError = vi.fn();
    let capturedCallback = null;

    window.google = {
      accounts: {
        id: {
          initialize: vi.fn(({ callback }) => { capturedCallback = callback; }),
          renderButton: vi.fn(),
        },
      },
    };

    render(<GoogleLoginButton onSuccess={vi.fn()} onError={onError} />);

    await act(async () => {
      capturedCallback?.({});
    });

    expect(onError).toHaveBeenCalledWith("no_credential");
  });
});
