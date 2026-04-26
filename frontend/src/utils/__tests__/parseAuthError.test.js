import { describe, expect, it } from "vitest";
import { parseAuthError } from "../parseAuthError";

const makeAxiosError = (status, data) => ({
  response: { status, data },
});

describe("parseAuthError", () => {
  it("returns network_error when no response (network failure)", () => {
    const result = parseAuthError(new Error("Network Error"));
    expect(result.code).toBe("network_error");
    expect(result.msgKey).toBe("auth.networkError");
    expect(result.detail).toBeNull();
  });

  it("returns invalid_credentials for 401", () => {
    const result = parseAuthError(makeAxiosError(401, { detail: "No active account found." }));
    expect(result.code).toBe("invalid_credentials");
    expect(result.msgKey).toBe("auth.invalidCredentials");
    expect(result.detail).toBe("No active account found.");
  });

  it("returns invalid_credentials with null detail when 401 body has no detail", () => {
    const result = parseAuthError(makeAxiosError(401, {}));
    expect(result.code).toBe("invalid_credentials");
    expect(result.detail).toBeNull();
  });

  it("returns rate_limited for 429", () => {
    const result = parseAuthError(makeAxiosError(429, { detail: "Throttled." }));
    expect(result.code).toBe("rate_limited");
    expect(result.msgKey).toBe("auth.rateLimited");
    expect(result.detail).toBeNull();
  });

  it("returns validation_error for 400 and joins field messages", () => {
    const result = parseAuthError(
      makeAxiosError(400, {
        username: ["A user with that username already exists."],
        password: ["This password is too short.", "This password is too common."],
      })
    );
    expect(result.code).toBe("validation_error");
    expect(result.msgKey).toBe("auth.validationError");
    expect(result.detail).toContain("already exists");
    expect(result.detail).toContain("too short");
  });

  it("returns validation_error with null detail for empty 400 body", () => {
    const result = parseAuthError(makeAxiosError(400, {}));
    expect(result.code).toBe("validation_error");
    expect(result.detail).toBeNull();
  });

  it("returns server_error for 500", () => {
    const result = parseAuthError(makeAxiosError(500, { detail: "Internal server error." }));
    expect(result.code).toBe("server_error");
    expect(result.msgKey).toBe("auth.serverError");
  });

  it("returns server_error for 503", () => {
    expect(parseAuthError(makeAxiosError(503, {})).code).toBe("server_error");
  });

  it("returns unknown for unexpected status like 409", () => {
    const result = parseAuthError(makeAxiosError(409, {}));
    expect(result.code).toBe("unknown");
    expect(result.msgKey).toBe("auth.errorUnknown");
  });

  it("returns unknown when called with null", () => {
    expect(parseAuthError(null).code).toBe("unknown");
  });
});
