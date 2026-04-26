/**
 * Evaluates password strength based on six criteria.
 * Returns { level: "weak"|"medium"|"strong", score: 0-6, checks }.
 *
 * Scoring (only when length >= 8):
 *   ≤ 3 checks → weak
 *   4 checks   → medium
 *   ≥ 5 checks → strong
 */
export function assessPasswordStrength(password) {
  const pw = password || "";

  const checks = {
    hasMinLength: pw.length >= 8,
    hasGoodLength: pw.length >= 12,
    hasLower: /[a-z]/.test(pw),
    hasUpper: /[A-Z]/.test(pw),
    hasDigit: /\d/.test(pw),
    hasSpecial: /[^A-Za-z0-9]/.test(pw),
  };

  if (!checks.hasMinLength) {
    return { level: "weak", score: 0, checks };
  }

  const score = Object.values(checks).filter(Boolean).length;

  let level;
  if (score <= 3) level = "weak";
  else if (score === 4) level = "medium";
  else level = "strong";

  return { level, score, checks };
}
