import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AuthContext from "../../context/AuthContext";
import { I18nProvider } from "../../context/I18nContext";
import AuthPanel from "../AuthPanel";

/* ── helpers ──────────────────────────────────────────────── */

function makeAuthCtx(overrides = {}) {
  return {
    user: null,
    agreement: null,
    agreementStatus: { loading: false, error: "" },
    authStatus: { loading: false, error: "" },
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    acceptActiveAgreement: vi.fn(),
    ...overrides,
  };
}

function renderPanel(ctx, props = {}) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={ctx}>
        <I18nProvider>
          <AuthPanel {...props} />
        </I18nProvider>
      </AuthContext.Provider>
    </MemoryRouter>
  );
}

async function fillLoginForm(username = "testuser", password = "pass") {
  await userEvent.type(document.querySelector('input[name="username"]'), username);
  await userEvent.type(document.querySelector('input[name="password"]'), password);
  await userEvent.click(screen.getByRole("button", { name: /sign in/i }));
}

async function switchToRegister() {
  await userEvent.click(screen.getByRole("button", { name: /^register$/i }));
}

async function fillRegisterForm(password = "LongPass1!") {
  await switchToRegister();
  await userEvent.type(document.querySelector('input[name="username"]'), "newuser");
  await userEvent.type(document.querySelector('input[name="password"]'), password);
  await userEvent.type(document.querySelector('input[name="confirmPassword"]'), password);
  await userEvent.click(screen.getByRole("button", { name: /create account/i }));
}

/* ── login error scenarios ───────────────────────────────── */

describe("AuthPanel login", () => {
  beforeEach(() => {
    window.localStorage.setItem("ewp_language", "en");
  });

  it("smoke: successful login calls onAuthSuccess", async () => {
    const ctx = makeAuthCtx({ login: vi.fn().mockResolvedValue({ ok: true }) });
    const onAuthSuccess = vi.fn();
    renderPanel(ctx, { onAuthSuccess });

    await fillLoginForm();

    await waitFor(() => expect(ctx.login).toHaveBeenCalledTimes(1));
    expect(ctx.login).toHaveBeenCalledWith({ username: "testuser", password: "pass" });
    expect(onAuthSuccess).toHaveBeenCalledTimes(1);
  });

  it("shows 'Invalid credentials' on 401", async () => {
    const ctx = makeAuthCtx({
      login: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: "invalid_credentials", msgKey: "auth.invalidCredentials", detail: null },
      }),
    });
    renderPanel(ctx);
    await fillLoginForm();
    await waitFor(() =>
      expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument()
    );
  });

  it("appends backend detail to 401 message", async () => {
    const ctx = makeAuthCtx({
      login: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: "invalid_credentials", msgKey: "auth.invalidCredentials", detail: "No active account found." },
      }),
    });
    renderPanel(ctx);
    await fillLoginForm();
    await waitFor(() =>
      expect(screen.getByText(/No active account found/i)).toBeInTheDocument()
    );
  });

  it("shows rate-limit message on 429", async () => {
    const ctx = makeAuthCtx({
      login: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: "rate_limited", msgKey: "auth.rateLimited", detail: null },
      }),
    });
    renderPanel(ctx);
    await fillLoginForm();
    await waitFor(() =>
      expect(screen.getByText(/Too many attempts/i)).toBeInTheDocument()
    );
  });

  it("shows server error on 500", async () => {
    const ctx = makeAuthCtx({
      login: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: "server_error", msgKey: "auth.serverError", detail: null },
      }),
    });
    renderPanel(ctx);
    await fillLoginForm();
    await waitFor(() =>
      expect(screen.getByText(/Server is unavailable/i)).toBeInTheDocument()
    );
  });

  it("shows network error when no response", async () => {
    const ctx = makeAuthCtx({
      login: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: "network_error", msgKey: "auth.networkError", detail: null },
      }),
    });
    renderPanel(ctx);
    await fillLoginForm();
    await waitFor(() =>
      expect(screen.getByText(/Cannot reach server/i)).toBeInTheDocument()
    );
  });
});

/* ── register scenarios ──────────────────────────────────── */

describe("AuthPanel register", () => {
  beforeEach(() => {
    window.localStorage.setItem("ewp_language", "en");
  });

  it("shows backend 400 validation detail", async () => {
    const ctx = makeAuthCtx({
      register: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: "validation_error", msgKey: "auth.validationError", detail: "This password is too short." },
      }),
    });
    renderPanel(ctx);
    await fillRegisterForm();
    await waitFor(() =>
      expect(screen.getByText(/too short/i)).toBeInTheDocument()
    );
  });

  it("shows success message and switches to login on ok", async () => {
    const ctx = makeAuthCtx({ register: vi.fn().mockResolvedValue({ ok: true }) });
    renderPanel(ctx);
    await fillRegisterForm();
    await waitFor(() =>
      expect(screen.getByText(/Registration successful/i)).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("blocks submit and shows error when password is shorter than 8 chars", async () => {
    const ctx = makeAuthCtx({ register: vi.fn() });
    renderPanel(ctx);
    await fillRegisterForm("Short1!");          // 7 chars
    await waitFor(() =>
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
    );
    expect(ctx.register).not.toHaveBeenCalled();
  });

  it("blocks submit and shows mismatch error when passwords differ", async () => {
    const ctx = makeAuthCtx({ register: vi.fn() });
    renderPanel(ctx);
    await switchToRegister();
    await userEvent.type(document.querySelector('input[name="username"]'), "newuser");
    await userEvent.type(document.querySelector('input[name="password"]'), "LongPass1!");
    await userEvent.type(document.querySelector('input[name="confirmPassword"]'), "Different1!");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));
    await waitFor(() =>
      expect(screen.getByText(/do not match/i)).toBeInTheDocument()
    );
    expect(ctx.register).not.toHaveBeenCalled();
  });
});

/* ── password show/hide toggle ───────────────────────────── */

describe("AuthPanel password toggle", () => {
  beforeEach(() => {
    window.localStorage.setItem("ewp_language", "en");
  });

  it("login: password field starts as type=password", () => {
    renderPanel(makeAuthCtx());
    expect(document.querySelector('input[name="password"]').type).toBe("password");
  });

  it("login: toggle button reveals password (type=text)", async () => {
    renderPanel(makeAuthCtx());
    const toggle = screen.getByRole("button", { name: /show password/i });
    await userEvent.click(toggle);
    expect(document.querySelector('input[name="password"]').type).toBe("text");
  });

  it("login: second toggle click hides password again", async () => {
    renderPanel(makeAuthCtx());
    const toggle = screen.getByRole("button", { name: /show password/i });
    await userEvent.click(toggle);
    await userEvent.click(screen.getByRole("button", { name: /hide password/i }));
    expect(document.querySelector('input[name="password"]').type).toBe("password");
  });

  it("register: confirm password has its own independent toggle", async () => {
    renderPanel(makeAuthCtx());
    await switchToRegister();
    const toggles = screen.getAllByRole("button", { name: /show password/i });
    // Two toggles: password + confirmPassword
    expect(toggles).toHaveLength(2);
    await userEvent.click(toggles[1]);
    expect(document.querySelector('input[name="confirmPassword"]').type).toBe("text");
    expect(document.querySelector('input[name="password"]').type).toBe("password");
  });

  it("toggle button has correct aria-label after state change", async () => {
    renderPanel(makeAuthCtx());
    const toggle = screen.getByRole("button", { name: /show password/i });
    await userEvent.click(toggle);
    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument();
  });
});

/* ── password strength meter ─────────────────────────────── */

describe("AuthPanel password strength meter", () => {
  beforeEach(() => {
    window.localStorage.setItem("ewp_language", "en");
  });

  async function openRegister() {
    renderPanel(makeAuthCtx());
    await switchToRegister();
  }

  it("meter is not visible before typing", async () => {
    await openRegister();
    expect(screen.queryByText(/^Weak$/i)).toBeNull();
    expect(screen.queryByText(/^Medium$/i)).toBeNull();
    expect(screen.queryByText(/^Strong$/i)).toBeNull();
  });

  it("shows Weak for short or simple password", async () => {
    await openRegister();
    await userEvent.type(document.querySelector('input[name="password"]'), "abc");
    expect(screen.getByText(/^Weak$/i)).toBeInTheDocument();
  });

  it("shows Medium for a moderately strong password", async () => {
    await openRegister();
    await userEvent.type(document.querySelector('input[name="password"]'), "Password1");
    expect(screen.getByText(/^Medium$/i)).toBeInTheDocument();
  });

  it("shows Strong for a complex password", async () => {
    await openRegister();
    await userEvent.type(document.querySelector('input[name="password"]'), "Password1!");
    expect(screen.getByText(/^Strong$/i)).toBeInTheDocument();
  });

  it("meter is not rendered in login mode", () => {
    renderPanel(makeAuthCtx());
    // In login mode there is no register form, so strength meter shouldn't exist
    expect(screen.queryByText(/^Weak$/i)).toBeNull();
    expect(screen.queryByText(/^Strong$/i)).toBeNull();
  });
});
