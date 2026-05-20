import React, { useEffect, useRef, useState } from "react";
import { useI18n } from "../../context/I18nContext";

const CURRENCIES = ["USD", "EUR", "KZT", "RUB", "GBP", "CNY", "JPY", "AUD", "CAD", "CHF", "SGD", "AED", "TRY", "BRL", "INR"];

const PROFESSIONS = [
  "Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "Mobile Developer", "DevOps Engineer", "Cloud Architect", "Cybersecurity Analyst",
  "Data Scientist", "Data Analyst", "Data Engineer", "Machine Learning Engineer", "AI Researcher",
  "Product Manager", "Project Manager", "Scrum Master", "Business Analyst",
  "UX Designer", "UI Designer", "Graphic Designer", "Web Designer",
  "Doctor", "Surgeon", "Dentist", "Nurse", "Pharmacist", "Psychologist", "Therapist",
  "Lawyer", "Attorney", "Legal Advisor", "Judge",
  "Teacher", "Professor", "Tutor", "Academic Researcher",
  "Accountant", "Auditor", "Financial Analyst", "Investment Banker", "Portfolio Manager",
  "Marketing Manager", "Digital Marketer", "SEO Specialist", "Content Creator",
  "Sales Manager", "Sales Representative", "Account Manager",
  "HR Manager", "Recruiter", "Talent Acquisition Specialist",
  "Civil Engineer", "Mechanical Engineer", "Electrical Engineer", "Chemical Engineer", "Structural Engineer",
  "Architect", "Interior Designer", "Urban Planner",
  "Journalist", "Writer", "Editor", "Translator",
  "Economist", "Consultant", "Strategy Analyst",
  "Entrepreneur", "Business Owner", "Startup Founder",
  "Physicist", "Chemist", "Biologist", "Geologist",
  "Operations Manager", "Supply Chain Manager", "Logistics Coordinator",
  "Social Worker", "NGO Specialist",
  "Chef", "Restaurant Manager",
  "Pilot", "Air Traffic Controller",
  "Police Officer", "Military Officer",
  "Бухгалтер", "Программист", "Врач", "Учитель", "Юрист", "Инженер", "Менеджер",
  "Аналитик", "Дизайнер", "Маркетолог", "Архитектор", "Экономист",
];

/* Searchable country combobox */
function CountrySearch({ id, name, options, value, onChange, placeholder, error }) {
  const [query, setQuery] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const containerRef = useRef(null);

  /* sync external value reset (e.g. form reset) */
  useEffect(() => {
    if (!value) setQuery("");
  }, [value]);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    if (q.length >= 1) {
      const lower = q.toLowerCase();
      setFiltered(options.filter((o) => o.toLowerCase().includes(lower)).slice(0, 8));
      setOpen(true);
    } else {
      setFiltered([]);
      setOpen(false);
      onChange({ target: { name, value: "" } });
    }
  }

  function handleSelect(opt) {
    setQuery(opt);
    setOpen(false);
    onChange({ target: { name, value: opt } });
  }

  function handleBlur() {
    /* slight delay so click on option registers first */
    setTimeout(() => setOpen(false), 150);
    /* if typed value doesn't match any option, clear */
    if (!options.includes(query)) {
      setQuery("");
      onChange({ target: { name, value: "" } });
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        className={`input mt-1 w-full${error ? " border-rose-400" : ""}`}
        value={query}
        onChange={handleInput}
        onBlur={handleBlur}
        onFocus={() => query.length >= 1 && filtered.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open}
      />
      {open && filtered.length > 0 && (
        <div
          className="absolute z-50 w-full mt-1 rounded-lg border border-[var(--panel-border-strong)] bg-[var(--modal-surface)] shadow-xl max-h-52 overflow-y-auto"
          role="listbox"
        >
          {filtered.map((opt) => (
            <button
              key={opt}
              type="button"
              role="option"
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface)] transition-colors"
              onMouseDown={() => handleSelect(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const professionId = "ia-profession-list";

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

  const countryNames = countries.map((c) => c.name);

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
          {errors.age && <p className="text-xs text-rose-400 mt-1" role="alert">{errors.age}</p>}
        </div>

        {/* Country — searchable */}
        <div>
          <label className="label" htmlFor="ia-country">{t("incomeAnalysis.country")}</label>
          <CountrySearch
            id="ia-country"
            name="country"
            options={countryNames}
            value={fields.country}
            onChange={handleChange}
            placeholder={t("incomeAnalysis.searchCountry")}
            error={errors.country}
          />
          {errors.country && <p className="text-xs text-rose-400 mt-1" role="alert">{errors.country}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Profession — with datalist suggestions */}
        <div>
          <label className="label" htmlFor="ia-profession">{t("incomeAnalysis.profession")}</label>
          <input
            id="ia-profession"
            name="profession"
            type="text"
            list={professionId}
            className="input mt-1"
            value={fields.profession}
            onChange={handleChange}
            placeholder={t("incomeAnalysis.professionPlaceholder")}
            autoComplete="off"
          />
          <datalist id={professionId}>
            {PROFESSIONS.map((p) => <option key={p} value={p} />)}
          </datalist>
          {errors.profession && <p className="text-xs text-rose-400 mt-1" role="alert">{errors.profession}</p>}
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
          {errors.experienceYears && <p className="text-xs text-rose-400 mt-1" role="alert">{errors.experienceYears}</p>}
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
          {errors.monthlyIncome && <p className="text-xs text-rose-400 mt-1" role="alert">{errors.monthlyIncome}</p>}
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
          {errors.monthlyExpenses && <p className="text-xs text-rose-400 mt-1" role="alert">{errors.monthlyExpenses}</p>}
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
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
