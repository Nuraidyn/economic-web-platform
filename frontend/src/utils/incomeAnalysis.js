/**
 * Income Analysis — pure calculation utilities.
 * All functions are side-effect-free and work on plain numbers.
 */

/**
 * Net monthly savings (income minus expenses).
 * @param {number} income
 * @param {number} expenses
 * @returns {number}
 */
export function calcSavings(income, expenses) {
  return income - expenses;
}

/**
 * Savings rate as a percentage of income.
 * Returns 0 when income is zero or negative to avoid division by zero.
 * @param {number} income
 * @param {number} expenses
 * @returns {number} percentage 0-100 (can be negative if expenses > income)
 */
export function calcSavingsRate(income, expenses) {
  if (income <= 0) return 0;
  return ((income - expenses) / income) * 100;
}

/**
 * Compound-growth projected income after `years` years.
 * @param {number} income  - current monthly income
 * @param {number} growthPct - annual growth percentage (e.g. 5 for 5%)
 * @param {number} [years=1]
 * @returns {number}
 */
export function calcProjectedIncome(income, growthPct, years = 1) {
  return income * Math.pow(1 + growthPct / 100, years);
}

/**
 * Qualitative financial status label.
 * - "deficit"  — expenses exceed income
 * - "stable"   — savings rate < 20%
 * - "strong"   — savings rate >= 20%
 * @param {number} income
 * @param {number} expenses
 * @returns {"deficit"|"stable"|"strong"}
 */
export function calcFinancialStatus(income, expenses) {
  const savings = calcSavings(income, expenses);
  const rate = calcSavingsRate(income, expenses);
  if (savings < 0) return "deficit";
  if (rate < 20) return "stable";
  return "strong";
}

/* ── Static AI insight helpers ───────────────────────────── */

/** Profession keyword → top 3 recommended countries */
const PROFESSION_COUNTRIES = {
  engineer:    ["USA", "Germany", "Canada"],
  developer:   ["USA", "Germany", "Canada"],
  software:    ["USA", "Germany", "Netherlands"],
  doctor:      ["Germany", "Switzerland", "Australia"],
  nurse:       ["Germany", "UK", "Australia"],
  teacher:     ["Finland", "Germany", "Canada"],
  lawyer:      ["USA", "UK", "Germany"],
  accountant:  ["USA", "UK", "Australia"],
  designer:    ["USA", "Netherlands", "UK"],
  data:        ["USA", "UK", "Germany"],
  analyst:     ["USA", "UK", "Germany"],
  manager:     ["USA", "UK", "Switzerland"],
  finance:     ["USA", "UK", "Switzerland"],
  marketing:   ["USA", "UK", "Australia"],
  architect:   ["USA", "Germany", "Netherlands"],
  scientist:   ["USA", "Germany", "Switzerland"],
};

/**
 * Returns top 3 countries for a given profession string.
 * Falls back to a generic list if no keyword matches.
 * @param {string} profession
 * @returns {string[]}
 */
export function getTopCountriesForProfession(profession) {
  const lower = (profession || "").toLowerCase();
  for (const [keyword, countries] of Object.entries(PROFESSION_COUNTRIES)) {
    if (lower.includes(keyword)) return countries;
  }
  return ["USA", "Germany", "Canada"];
}

/**
 * Income growth tips based on savings rate.
 * @param {number} savingsRate
 * @returns {string[]}
 */
export function getIncomeTips(savingsRate) {
  const tier = savingsRate < 0 ? "deficit" : savingsRate < 20 ? "stable" : "strong";
  return [1, 2, 3].map((n) => `ai.incomeTip.${tier}${n}`);
}

/**
 * Expense optimization tips based on savings rate.
 * @param {number} savingsRate
 * @returns {string[]}
 */
export function getExpenseTips(savingsRate) {
  const tier = savingsRate < 0 ? "deficit" : savingsRate < 20 ? "stable" : "strong";
  return [1, 2, 3].map((n) => `ai.expenseTip.${tier}${n}`);
}

/**
 * 3/6/12-month action plan goals.
 * @param {number} income
 * @param {number} expenses
 * @param {number} savingsRate
 * @param {number} experienceYears
 * @returns {{ month3: string, month6: string, month12: string }}
 */
export function getActionPlan(income, expenses, savingsRate, experienceYears) {
  const savings = calcSavings(income, expenses);
  const emergency = Math.max(income * 3, 0);

  return {
    month3:  savings < 0
      ? { key: "ai.plan3.deficit" }
      : { key: "ai.plan3.surplus", vars: { savings: savings.toFixed(0) } },
    month6: savingsRate < 20
      ? { key: "ai.plan6.low",  vars: { target: (income * 0.2).toFixed(0) } }
      : { key: "ai.plan6.high", vars: { reserve: emergency.toFixed(0) } },
    month12: experienceYears >= 2
      ? { key: "ai.plan12.experienced" }
      : { key: "ai.plan12.junior" },
  };
}

// ── Income Comparison calculations ──────────────────────────────────────────

/** Nominal salary gap vs country average */
export function calcSalaryGap(userSalary, countryAvg) {
  return userSalary - countryAvg;
}

/** Salary gap as percentage of country average */
export function calcSalaryGapPercent(userSalary, countryAvg) {
  if (countryAvg <= 0) return 0;
  return ((userSalary - countryAvg) / countryAvg) * 100;
}

/**
 * Cumulative inflation over N years ending at currentYear.
 * yearlyInflation: { [year]: pct }  e.g. { 2022: 8.0, 2023: 4.1 }
 */
export function calcCumulativeInflation(yearlyInflation, years) {
  const currentYear = new Date().getFullYear();
  let cumulative = 1;
  for (let y = currentYear - years; y < currentYear; y++) {
    const rate = (yearlyInflation[y] ?? 3) / 100; // fallback 3%
    cumulative *= (1 + rate);
  }
  return cumulative - 1; // e.g. 0.15 = 15%
}

/** Inflation-adjusted (real) income */
export function calcRealIncome(nominalIncome, cumulativeInflation) {
  return nominalIncome / (1 + cumulativeInflation);
}

/**
 * Rank countries by real earning potential:
 * score = avgMonthlyIncome / (1 + cumulativeInflation)
 */
export function rankCountriesByRealEarnings(countriesData, years) {
  return Object.entries(countriesData)
    .map(([code, d]) => {
      const cumInfl = calcCumulativeInflation(d.yearlyInflation, years);
      const realIncome = calcRealIncome(d.avgMonthlyIncome, cumInfl);
      return { code, name: d.name, realIncome, cumInfl, avgMonthlyIncome: d.avgMonthlyIncome };
    })
    .sort((a, b) => b.realIncome - a.realIncome);
}

/**
 * PPP-adjusted salary: converts nominalUSD to purchasing-power equivalent
 * relative to the user's country price level.
 * pppIndex: price level vs USA (100). Higher = more expensive.
 * pppSalary = nominalUSD * (100 / pppIndex)
 */
export function calcPPPSalary(nominalUSD, pppIndex) {
  if (!pppIndex || pppIndex <= 0) return nominalUSD;
  return nominalUSD * (100 / pppIndex);
}

/**
 * Estimate income percentile within a country using a lognormal approximation
 * (coefficient of variation ≈ 0.8, typical for working-population income).
 * Returns integer 1–99.
 */
export function estimatePercentile(salaryUSD, countryAvgUSD) {
  if (!countryAvgUSD || countryAvgUSD <= 0 || salaryUSD <= 0) return null;
  const r = salaryUSD / countryAvgUSD;
  if (r < 0.20) return  4;
  if (r < 0.30) return  9;
  if (r < 0.42) return 16;
  if (r < 0.55) return 25;
  if (r < 0.68) return 34;
  if (r < 0.82) return 43;
  if (r < 0.97) return 50;
  if (r < 1.15) return 58;
  if (r < 1.35) return 65;
  if (r < 1.60) return 72;
  if (r < 1.90) return 78;
  if (r < 2.30) return 83;
  if (r < 2.80) return 88;
  if (r < 3.50) return 92;
  if (r < 4.50) return 95;
  return 97;
}

/**
 * Career stage based on years of experience.
 * Returns { stage, color, labelKey }
 */
export function getCareerStage(experienceYears) {
  if (experienceYears <= 2)  return { stage: "junior",  labelKey: "incomeAnalysis.stageJunior",  color: "text-amber-400" };
  if (experienceYears <= 6)  return { stage: "mid",     labelKey: "incomeAnalysis.stageMid",     color: "text-sky-400"   };
  if (experienceYears <= 14) return { stage: "senior",  labelKey: "incomeAnalysis.stageSenior",  color: "text-emerald-400" };
  return                            { stage: "expert",  labelKey: "incomeAnalysis.stageExpert",  color: "text-[var(--accent)]" };
}

/**
 * Years remaining until typical retirement age (65).
 * Returns 0 if already past retirement age.
 */
export function yearsToRetirement(age) {
  return Math.max(65 - age, 0);
}
