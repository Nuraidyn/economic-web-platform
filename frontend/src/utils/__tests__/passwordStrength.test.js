import { describe, expect, it } from "vitest";
import { assessPasswordStrength } from "../passwordStrength";

describe("assessPasswordStrength", () => {
  it("returns weak for empty string", () => {
    const { level, score } = assessPasswordStrength("");
    expect(level).toBe("weak");
    expect(score).toBe(0);
  });

  it("returns weak for password shorter than 8 chars", () => {
    expect(assessPasswordStrength("Ab1!").level).toBe("weak");
    expect(assessPasswordStrength("Ab1!").score).toBe(0);
  });

  it("returns weak for 8-char all-lowercase with no digit or special", () => {
    // hasMinLength + hasLower = score 2 → weak
    const { level, score, checks } = assessPasswordStrength("password");
    expect(level).toBe("weak");
    expect(score).toBe(2);
    expect(checks.hasMinLength).toBe(true);
    expect(checks.hasLower).toBe(true);
    expect(checks.hasDigit).toBe(false);
    expect(checks.hasUpper).toBe(false);
    expect(checks.hasSpecial).toBe(false);
  });

  it("returns medium for password with length, lower, upper, digit (score 4)", () => {
    // "Password1" → hasMinLength + hasLower + hasUpper + hasDigit = 4
    const { level, score } = assessPasswordStrength("Password1");
    expect(level).toBe("medium");
    expect(score).toBe(4);
  });

  it("returns strong for password with length, lower, upper, digit, special (score 5)", () => {
    const { level, score } = assessPasswordStrength("Password1!");
    expect(level).toBe("strong");
    expect(score).toBe(5);
  });

  it("returns strong for long password with all checks (score 6)", () => {
    const { level, score, checks } = assessPasswordStrength("LongPassword1!");
    expect(level).toBe("strong");
    expect(score).toBe(6);
    expect(checks.hasGoodLength).toBe(true);
  });

  it("hasGoodLength is false for exactly 8 chars", () => {
    const { checks } = assessPasswordStrength("Passw0r!");
    expect(checks.hasMinLength).toBe(true);
    expect(checks.hasGoodLength).toBe(false);
  });

  it("hasGoodLength is true for 12+ chars", () => {
    const { checks } = assessPasswordStrength("StrongPassw0rd");
    expect(checks.hasGoodLength).toBe(true);
  });

  it("hasSpecial detects non-alphanumeric chars", () => {
    expect(assessPasswordStrength("password@1").checks.hasSpecial).toBe(true);
    expect(assessPasswordStrength("password_1").checks.hasSpecial).toBe(true);
    expect(assessPasswordStrength("Password1A").checks.hasSpecial).toBe(false);
  });

  it("handles null/undefined gracefully", () => {
    expect(assessPasswordStrength(null).level).toBe("weak");
    expect(assessPasswordStrength(undefined).level).toBe("weak");
  });
});
