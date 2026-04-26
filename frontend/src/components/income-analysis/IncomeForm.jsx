import React, { useState } from "react";
import { useI18n } from "../../context/I18nContext";

const CURRENCIES = ["USD", "EUR", "KZT", "RUB", "GBP", "CNY", "JPY", "AUD", "CAD", "CHF", "SGD", "AED", "TRY", "BRL", "INR"];

function validate(fields, t) {
  const errors = {};
  const age = Number(fields.age);
  const exp = Number(fields.experienceYears);
  const income = Number(fields.monthlyIncome);
  const expenses = Number(fields.monthlyExpenses);

  if (!fields.age || age < 16 || age > 100) errors.age = t("incomeAnalysis.errorAge");
  if (!fields.country) errors.country = t("incomeAnalysis.errorCountry");
  if (!fields.profession.trim()) errors.profession = t("incomeAnalysis.errorProfession");
  if (fields.experienceYears === "" || exp < 0) errors.experienceYears = t("incomeAnalysis.errorExperience");
  if (fields.monthlyIncome === "" || income < 0) errors.monthlyIncome = t("incomeAnalysis.errorIncome");
  if (fields.monthlyExpenses === "" || expenses < 0) errors.monthlyExpenses = t("incomeAnalysis.errorExpenses");
  return errors;
}

export default function IncomeForm({ onSubmit, countries = [] }) {
  const { t } = useI18n();

  const [fields, setFields] = useState({
    age: "",
    country: "",
    profession: "",
    experienceYears: "",
    monthlyIncome: "",
    monthlyExpenses: "",
    growthPct: "0",
    currency: "USD",
  });
  const [errors, setErrors] = useState({});

  function handleChange(e) {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(fields, t);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    onSubmit({
      age: Number(fields.age),
      country: fields.country,
      profession: fields.profession.trim(),
      experienceYears: Number(fields.experienceYears),
      monthlyIncome: Number(fields.monthlyIncome),
      monthlyExpenses: Number(fields.monthlyExpenses),
      growthPct: Number(fields.growthPct),
      currency: fields.currency,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="panel space-y-5">
      <h3 className="panel-title">{t("incomeAnalysis.formTitle")}</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Age */}
        <div>
          <label className="label" htmlFor="ia-age">{t("incomeAnalysis.age")}</label>
          <input
            id="ia-age"
            name="age"
            type="number"
            min="16"
            max="100"
            className="input mt-1"
            value={fields.age}
            onChange={handleChange}
            placeholder="e.g. 28"
          />
          {errors.age && (
            <p className="text-xs text-rose-400 mt-1" role="alert">{errors.age}</p>
          )}
        </div>

        {/* Country */}
        <div>
          <label className="label" htmlFor="ia-country">{t("incomeAnalysis.country")}</label>
          <select
            id="ia-country"
            name="country"
            className="input mt-1"
            value={fields.country}
            onChange={handleChange}
          >
            <option value="">{t("incomeAnalysis.selectCountry")}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.name}>{c.name}</option>
            ))}
          </select>
          {errors.country && (
            <p className="text-xs text-rose-400 mt-1" role="alert">{errors.country}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Profession */}
        <div>
          <label className="label" htmlFor="ia-profession">{t("incomeAnalysis.profession")}</label>
          <input
            id="ia-profession"
            name="profession"
            type="text"
            className="input mt-1"
            value={fields.profession}
            onChange={handleChange}
            placeholder={t("incomeAnalysis.professionPlaceholder")}
          />
          {errors.profession && (
            <p className="text-xs text-rose-400 mt-1" role="alert">{errors.profession}</p>
          )}
        </div>

        {/* Experience */}
        <div>
          <label className="label" htmlFor="ia-exp">{t("incomeAnalysis.experienceYears")}</label>
          <input
            id="ia-exp"
            name="experienceYears"
            type="number"
            min="0"
            className="input mt-1"
            value={fields.experienceYears}
            onChange={handleChange}
            placeholder="e.g. 3"
          />
          {errors.experienceYears && (
            <p className="text-xs text-rose-400 mt-1" role="alert">{errors.experienceYears}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Monthly Income */}
        <div>
          <label className="label" htmlFor="ia-income">{t("incomeAnalysis.monthlyIncome")}</label>
          <input
            id="ia-income"
            name="monthlyIncome"
            type="number"
            min="0"
            className="input mt-1"
            value={fields.monthlyIncome}
            onChange={handleChange}
            placeholder="e.g. 3000"
          />
          {errors.monthlyIncome && (
            <p className="text-xs text-rose-400 mt-1" role="alert">{errors.monthlyIncome}</p>
          )}
        </div>

        {/* Monthly Expenses */}
        <div>
          <label className="label" htmlFor="ia-expenses">{t("incomeAnalysis.monthlyExpenses")}</label>
          <input
            id="ia-expenses"
            name="monthlyExpenses"
            type="number"
            min="0"
            className="input mt-1"
            value={fields.monthlyExpenses}
            onChange={handleChange}
            placeholder="e.g. 2000"
          />
          {errors.monthlyExpenses && (
            <p className="text-xs text-rose-400 mt-1" role="alert">{errors.monthlyExpenses}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Growth % */}
        <div>
          <label className="label" htmlFor="ia-growth">{t("incomeAnalysis.growthPct")}</label>
          <input
            id="ia-growth"
            name="growthPct"
            type="number"
            className="input mt-1"
            value={fields.growthPct}
            onChange={handleChange}
            placeholder="e.g. 5"
          />
        </div>

        {/* Currency */}
        <div>
          <label className="label" htmlFor="ia-currency">{t("incomeAnalysis.currency")}</label>
          <select
            id="ia-currency"
            name="currency"
            className="input mt-1"
            value={fields.currency}
            onChange={handleChange}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-1">
        <button type="submit" className="btn-primary">
          {t("incomeAnalysis.analyze")}
        </button>
      </div>
    </form>
  );
}
