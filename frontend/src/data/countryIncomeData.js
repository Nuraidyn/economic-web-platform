// Income benchmark data. avgMonthlyIncome in USD (approximate net, working population).
// pppIndex: price level relative to USA (100). Higher = more expensive country.
// PPP-adjusted salary = nominalUSD * (100 / pppIndex)

export const USD_RATES = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  KZT: 0.00221,
  RUB: 0.011,
  CNY: 0.138,
  JPY: 0.0065,
  AUD: 0.65,
  CAD: 0.73,
  CHF: 1.12,
  SGD: 0.74,
  AED: 0.272,
  TRY: 0.029,
  BRL: 0.19,
  INR: 0.012,
  SEK: 0.094,
  NOK: 0.093,
  PLN: 0.25,
  KRW: 0.00075,
  SAR: 0.267,
  UAH: 0.024,
  MYR: 0.22,
  PHP: 0.018,
  IDR: 0.000064,
  ZAR: 0.055,
  MXN: 0.058,
};

export const COUNTRY_INCOME_DATA = {
  // ── North America ──────────────────────────────────────────────────────
  US: { name: "United States",   avgMonthlyIncome: 5800, pppIndex: 100, currency: "USD", yearlyInflation: { 2020: 1.2, 2021: 4.7, 2022: 8.0, 2023: 4.1, 2024: 3.2 } },
  CA: { name: "Canada",          avgMonthlyIncome: 4200, pppIndex:  84, currency: "CAD", yearlyInflation: { 2020: 0.7, 2021: 3.4, 2022: 6.8, 2023: 3.9, 2024: 2.7 } },
  MX: { name: "Mexico",          avgMonthlyIncome:  870, pppIndex:  42, currency: "MXN", yearlyInflation: { 2020: 3.4, 2021: 5.7, 2022: 7.9, 2023: 5.5, 2024: 4.7 } },

  // ── Europe — West ──────────────────────────────────────────────────────
  GB: { name: "United Kingdom",  avgMonthlyIncome: 3500, pppIndex:  84, currency: "GBP", yearlyInflation: { 2020: 0.9, 2021: 2.5, 2022: 9.1, 2023: 7.3, 2024: 3.2 } },
  DE: { name: "Germany",         avgMonthlyIncome: 3900, pppIndex:  88, currency: "EUR", yearlyInflation: { 2020: 0.5, 2021: 3.1, 2022: 7.9, 2023: 5.9, 2024: 2.5 } },
  FR: { name: "France",          avgMonthlyIncome: 3200, pppIndex:  83, currency: "EUR", yearlyInflation: { 2020: 0.5, 2021: 1.6, 2022: 5.2, 2023: 4.9, 2024: 2.3 } },
  NL: { name: "Netherlands",     avgMonthlyIncome: 4100, pppIndex:  87, currency: "EUR", yearlyInflation: { 2020: 1.1, 2021: 2.7, 2022: 10.0, 2023: 4.1, 2024: 2.8 } },
  CH: { name: "Switzerland",     avgMonthlyIncome: 6800, pppIndex: 131, currency: "CHF", yearlyInflation: { 2020: -0.7, 2021: 0.6, 2022: 2.8, 2023: 2.1, 2024: 1.2 } },
  SE: { name: "Sweden",          avgMonthlyIncome: 4000, pppIndex:  84, currency: "SEK", yearlyInflation: { 2020: 0.5, 2021: 2.2, 2022: 8.4, 2023: 8.5, 2024: 3.5 } },
  NO: { name: "Norway",          avgMonthlyIncome: 5200, pppIndex: 112, currency: "NOK", yearlyInflation: { 2020: 1.3, 2021: 3.5, 2022: 5.8, 2023: 5.5, 2024: 3.8 } },
  ES: { name: "Spain",           avgMonthlyIncome: 2400, pppIndex:  73, currency: "EUR", yearlyInflation: { 2020: -0.3, 2021: 3.0, 2022: 8.4, 2023: 3.4, 2024: 2.8 } },
  IT: { name: "Italy",           avgMonthlyIncome: 2300, pppIndex:  76, currency: "EUR", yearlyInflation: { 2020: -0.1, 2021: 1.9, 2022: 8.7, 2023: 5.9, 2024: 1.0 } },

  // ── Europe — East ──────────────────────────────────────────────────────
  PL: { name: "Poland",          avgMonthlyIncome: 1700, pppIndex:  55, currency: "PLN", yearlyInflation: { 2020: 3.4, 2021: 5.1, 2022: 14.4, 2023: 11.4, 2024: 3.8 } },
  UA: { name: "Ukraine",         avgMonthlyIncome:  480, pppIndex:  31, currency: "UAH", yearlyInflation: { 2020: 2.7, 2021: 9.4, 2022: 20.2, 2023: 12.8, 2024: 8.5 } },
  RU: { name: "Russia",          avgMonthlyIncome: 1100, pppIndex:  46, currency: "RUB", yearlyInflation: { 2020: 4.9, 2021: 8.4, 2022: 13.7, 2023: 7.4, 2024: 8.1 } },

  // ── Middle East ────────────────────────────────────────────────────────
  AE: { name: "UAE",             avgMonthlyIncome: 3800, pppIndex:  67, currency: "AED", yearlyInflation: { 2020: -2.1, 2021: 0.0, 2022: 4.8, 2023: 4.3, 2024: 2.3 } },
  SA: { name: "Saudi Arabia",    avgMonthlyIncome: 2100, pppIndex:  55, currency: "SAR", yearlyInflation: { 2020: 3.4, 2021: 3.1, 2022: 2.5, 2023: 2.3, 2024: 1.8 } },
  TR: { name: "Turkey",          avgMonthlyIncome:  700, pppIndex:  31, currency: "TRY", yearlyInflation: { 2020: 12.3, 2021: 19.6, 2022: 72.3, 2023: 53.9, 2024: 58.5 } },

  // ── Central Asia ───────────────────────────────────────────────────────
  KZ: { name: "Kazakhstan",      avgMonthlyIncome:  900, pppIndex:  38, currency: "KZT", yearlyInflation: { 2020: 6.8, 2021: 8.4, 2022: 15.0, 2023: 10.8, 2024: 8.5 } },

  // ── Asia Pacific ───────────────────────────────────────────────────────
  CN: { name: "China",           avgMonthlyIncome: 1600, pppIndex:  58, currency: "CNY", yearlyInflation: { 2020: 2.5, 2021: 0.9, 2022: 2.0, 2023: 0.2, 2024: 0.3 } },
  JP: { name: "Japan",           avgMonthlyIncome: 2800, pppIndex:  83, currency: "JPY", yearlyInflation: { 2020: 0.0, 2021: -0.2, 2022: 2.5, 2023: 3.3, 2024: 2.6 } },
  KR: { name: "South Korea",     avgMonthlyIncome: 2900, pppIndex:  82, currency: "KRW", yearlyInflation: { 2020: 0.5, 2021: 2.5, 2022: 5.1, 2023: 3.6, 2024: 2.3 } },
  AU: { name: "Australia",       avgMonthlyIncome: 4500, pppIndex:  83, currency: "AUD", yearlyInflation: { 2020: 0.9, 2021: 2.8, 2022: 6.6, 2023: 5.4, 2024: 3.5 } },
  SG: { name: "Singapore",       avgMonthlyIncome: 4800, pppIndex:  82, currency: "SGD", yearlyInflation: { 2020: -0.2, 2021: 2.3, 2022: 6.1, 2023: 4.8, 2024: 2.4 } },
  IN: { name: "India",           avgMonthlyIncome:  500, pppIndex:  28, currency: "INR", yearlyInflation: { 2020: 6.2, 2021: 5.1, 2022: 6.7, 2023: 5.7, 2024: 4.8 } },
  MY: { name: "Malaysia",        avgMonthlyIncome: 1300, pppIndex:  48, currency: "MYR", yearlyInflation: { 2020: -1.1, 2021: 2.5, 2022: 3.4, 2023: 2.5, 2024: 1.8 } },
  PH: { name: "Philippines",     avgMonthlyIncome:  450, pppIndex:  33, currency: "PHP", yearlyInflation: { 2020: 2.6, 2021: 3.9, 2022: 5.8, 2023: 6.0, 2024: 3.3 } },
  ID: { name: "Indonesia",       avgMonthlyIncome:  520, pppIndex:  37, currency: "IDR", yearlyInflation: { 2020: 2.0, 2021: 1.6, 2022: 4.2, 2023: 3.7, 2024: 2.8 } },

  // ── Latin America ──────────────────────────────────────────────────────
  BR: { name: "Brazil",          avgMonthlyIncome:  800, pppIndex:  48, currency: "BRL", yearlyInflation: { 2020: 4.5, 2021: 10.1, 2022: 5.8, 2023: 4.6, 2024: 4.5 } },

  // ── Africa ─────────────────────────────────────────────────────────────
  ZA: { name: "South Africa",    avgMonthlyIncome:  900, pppIndex:  42, currency: "ZAR", yearlyInflation: { 2020: 3.3, 2021: 4.5, 2022: 6.9, 2023: 6.1, 2024: 4.6 } },
};

export const COMPARISON_COUNTRIES = Object.entries(COUNTRY_INCOME_DATA).map(([code, d]) => ({
  code, name: d.name,
}));

export const PERIOD_YEARS = { "1Y": 1, "3Y": 3, "5Y": 5 };
