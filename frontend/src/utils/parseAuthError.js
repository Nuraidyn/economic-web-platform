/**
 * Parses an Axios error thrown by an auth API call into a structured object.
 * Returns { code, msgKey, detail } where msgKey is an i18n translation key
 * and detail is an optional human-readable string extracted from the backend response.
 */
export function parseAuthError(error) {
  if (!error) {
    return { code: "unknown", msgKey: "auth.errorUnknown", detail: null };
  }

  // No response → network failure or request timeout
  if (!error.response) {
    return { code: "network_error", msgKey: "auth.networkError", detail: null };
  }

  const { status, data } = error.response;

  if (status === 401) {
    const detail = typeof data?.detail === "string" ? data.detail : null;
    return { code: "invalid_credentials", msgKey: "auth.invalidCredentials", detail };
  }

  if (status === 403) {
    if (data?.code === "email_not_verified") {
      return {
        code: "email_not_verified",
        msgKey: "auth.emailNotVerified",
        detail: null,
        email: typeof data.email === "string" ? data.email : null,
      };
    }
    return { code: "forbidden", msgKey: "auth.errorUnknown", detail: null };
  }

  if (status === 429) {
    return { code: "rate_limited", msgKey: "auth.rateLimited", detail: null };
  }

  if (status === 400) {
    // Django returns field-level errors: { field: ["msg", ...], non_field_errors: [...] }
    const messages = [];
    if (data && typeof data === "object") {
      for (const messages_ of Object.values(data)) {
        if (Array.isArray(messages_)) {
          messages.push(...messages_.map(String));
        } else if (typeof messages_ === "string") {
          messages.push(messages_);
        }
      }
    }
    return {
      code: "validation_error",
      msgKey: "auth.validationError",
      detail: messages.length ? messages.join(" ") : null,
    };
  }

  if (status >= 500) {
    return { code: "server_error", msgKey: "auth.serverError", detail: null };
  }

  return { code: "unknown", msgKey: "auth.errorUnknown", detail: null };
}
