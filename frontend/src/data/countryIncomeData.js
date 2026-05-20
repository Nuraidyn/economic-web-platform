// Mock data layer — replace with API calls when backend endpoint is available
// Structure: { [countryCode]: { name, avgMonthlyIncome (USD), yearlyInflation: { [year]: pct }, currency } }

// Approximate exchange rates to USD (1 unit of currency → USD)
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
};

export const COUNTRY_INCOME_DATA = {
  US: { name: "United States", avgMonthlyIncome: 5800, currency: "USD", yearlyInflation: { 2020: 1.2, 2021: 4.7, 2022: 8.0, 2023: 4.1, 2024: 3.2 } },
  DE: { name: "Germany",       avgMonthlyIncome: 3900, currency: "EUR", yearlyInflation: { 2020: 0.5, 2021: 3.1, 2022: 7.9, 2023: 5.9, 2024: 2.5 } },
  GB: { name: "United Kingdom",avgMonthlyIncome: 3500, currency: "GBP", yearlyInflation: { 2020: 0.9, 2021: 2.5, 2022: 9.1, 2023: 7.3, 2024: 3.2 } },
  FR: { name: "France",        avgMonthlyIncome: 3200, currency: "EUR", yearlyInflation: { 2020: 0.5, 2021: 1.6, 2022: 5.2, 2023: 4.9, 2024: 2.3 } },
  KZ: { name: "Kazakhstan",    avgMonthlyIncome: 900,  currency: "KZT", yearlyInflation: { 2020: 6.8, 2021: 8.4, 2022: 15.0, 2023: 10.8, 2024: 8.5 } },
  RU: { name: "Russia",        avgMonthlyIncome: 1100, currency: "RUB", yearlyInflation: { 2020: 4.9, 2021: 8.4, 2022: 13.7, 2023: 7.4, 2024: 8.1 } },
  CN: { name: "China",         avgMonthlyIncome: 1600, currency: "CNY", yearlyInflation: { 2020: 2.5, 2021: 0.9, 2022: 2.0, 2023: 0.2, 2024: 0.3 } },
  JP: { name: "Japan",         avgMonthlyIncome: 2800, currency: "JPY", yearlyInflation: { 2020: 0.0, 2021: -0.2, 2022: 2.5, 2023: 3.3, 2024: 2.6 } },
  CA: { name: "Canada",        avgMonthlyIncome: 4200, currency: "CAD", yearlyInflation: { 2020: 0.7, 2021: 3.4, 2022: 6.8, 2023: 3.9, 2024: 2.7 } },
  AU: { name: "Australia",     avgMonthlyIncome: 4500, currency: "AUD", yearlyInflation: { 2020: 0.9, 2021: 2.8, 2022: 6.6, 2023: 5.4, 2024: 3.5 } },
  BR: { name: "Brazil",        avgMonthlyIncome: 800,  currency: "BRL", yearlyInflation: { 2020: 4.5, 2021: 10.1, 2022: 5.8, 2023: 4.6, 2024: 4.5 } },
  IN: { name: "India",         avgMonthlyIncome: 500,  currency: "INR", yearlyInflation: { 2020: 6.2, 2021: 5.1, 2022: 6.7, 2023: 5.7, 2024: 4.8 } },
  AE: { name: "UAE",           avgMonthlyIncome: 3800, currency: "AED", yearlyInflation: { 2020: -2.1, 2021: 0.0, 2022: 4.8, 2023: 4.3, 2024: 2.3 } },
  SG: { name: "Singapore",     avgMonthlyIncome: 4800, currency: "SGD", yearlyInflation: { 2020: -0.2, 2021: 2.3, 2022: 6.1, 2023: 4.8, 2024: 2.4 } },
  TR: { name: "Turkey",        avgMonthlyIncome: 700,  currency: "TRY", yearlyInflation: { 2020: 12.3, 2021: 19.6, 2022: 72.3, 2023: 53.9, 2024: 58.5 } },
};

export const COMPARISON_COUNTRIES = Object.entries(COUNTRY_INCOME_DATA).map(([code, d]) => ({
  code, name: d.name,
}));

export const PERIOD_YEARS = { "1Y": 1, "3Y": 3, "5Y": 5 };
