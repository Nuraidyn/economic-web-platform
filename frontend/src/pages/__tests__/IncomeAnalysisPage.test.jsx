import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock chart libs to avoid canvas errors in jsdom
vi.mock("react-chartjs-2", () => ({
  Bar: () => <div data-testid="bar-chart" />,
}));
vi.mock("chart.js/auto", () => ({ Chart: class {} }));

// Mock ThemeContext so IncomeComparisonSection doesn't require a real provider
vi.mock("../../context/ThemeContext", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

// Mock AnalysisContext — IncomeAnalysisPage now reads countries from it
vi.mock("../../context/AnalysisContext", () => ({
  useAnalysis: () => ({
    countries: [
      { code: "DE", name: "Germany" },
      { code: "CA", name: "Canada" },
      { code: "US", name: "United States" },
      { code: "KZ", name: "Kazakhstan" },
    ],
  }),
}));

// Mock fetchIncomeInsights so the AI Insights button works in tests
vi.mock("../../api/analyticsApi", () => ({
  fetchIncomeInsights: vi.fn().mockResolvedValue({
    summary: "Test summary",
    income_benchmark: ["Benchmark A"],
    action_plan: { next_3_months: ["a"], next_6_months: ["b"], next_12_months: ["c"] },
    potential_countries: [{ country: "Germany", reason: "high demand", estimated_income_range: "varies" }],
    disclaimer: "Educational purposes only.",
    provider: "fallback",
  }),
  fetchGiniTrend: vi.fn(),
  fetchGiniRanking: vi.fn(),
}));

import IncomeAnalysisPage from "../IncomeAnalysisPage";
import { I18nProvider } from "../../context/I18nContext";

function renderPage() {
  return render(
    <I18nProvider>
      <IncomeAnalysisPage />
    </I18nProvider>
  );
}

describe("IncomeAnalysisPage", () => {
  beforeEach(() => {
    window.localStorage.setItem("ewp_language", "en");
  });

  it("renders the hero title and form", () => {
    renderPage();
    expect(screen.getByText(/Understand your income/i)).toBeInTheDocument();
    // form heading — use role to be specific
    expect(screen.getByRole("heading", { name: /Your Financial Profile/i })).toBeInTheDocument();
  });

  it("shows empty state placeholder before first submit", () => {
    renderPage();
    expect(screen.getByText(/Fill in your profile above/i)).toBeInTheDocument();
  });

  it("shows validation errors when submitting empty form", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /Analyze/i }));
    expect(await screen.findByText(/Age must be between/i)).toBeInTheDocument();
    expect(screen.getByText(/Please select a country/i)).toBeInTheDocument();
    expect(screen.getByText(/Please enter your profession/i)).toBeInTheDocument();
  });

  it("shows results after valid form submission", async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText(/Age/i), "30");
    const countrySelect = screen.getByLabelText(/Country/i);
    await userEvent.selectOptions(countrySelect, "Germany");
    await userEvent.type(screen.getByLabelText(/Profession/i), "Software Engineer");
    await userEvent.type(screen.getByLabelText(/Experience/i), "5");
    await userEvent.type(screen.getByLabelText(/Monthly Income/i), "4000");
    await userEvent.type(screen.getByLabelText(/Monthly Expenses/i), "2500");

    await userEvent.click(screen.getByRole("button", { name: /Analyze/i }));

    expect(await screen.findByText(/Results Summary/i)).toBeInTheDocument();
    // Label elements appear as uppercase .label spans — use getAllBy for duplicates
    expect(screen.getAllByText(/Net Savings/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Savings Rate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Projected Income/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Financial Status/i).length).toBeGreaterThan(0);
  });

  it("shows AI Insights section only after form submit", async () => {
    renderPage();

    // Before submit — no AI insights section (check for Generate Insights button specifically)
    expect(screen.queryByRole("button", { name: /Generate Insights/i })).not.toBeInTheDocument();

    // Fill and submit
    await userEvent.type(screen.getByLabelText(/Age/i), "25");
    await userEvent.selectOptions(screen.getByLabelText(/Country/i), "Canada");
    await userEvent.type(screen.getByLabelText(/Profession/i), "Data Analyst");
    await userEvent.type(screen.getByLabelText(/Experience/i), "2");
    await userEvent.type(screen.getByLabelText(/Monthly Income/i), "3000");
    await userEvent.type(screen.getByLabelText(/Monthly Expenses/i), "2000");
    await userEvent.click(screen.getByRole("button", { name: /Analyze/i }));

    expect(await screen.findByRole("button", { name: /Generate Insights/i })).toBeInTheDocument();
  });

  it("renders Generate Insights button in AI Insights section after form submit", async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText(/Age/i), "35");
    await userEvent.selectOptions(screen.getByLabelText(/Country/i), "United States");
    await userEvent.type(screen.getByLabelText(/Profession/i), "Engineer");
    await userEvent.type(screen.getByLabelText(/Experience/i), "10");
    await userEvent.type(screen.getByLabelText(/Monthly Income/i), "8000");
    await userEvent.type(screen.getByLabelText(/Monthly Expenses/i), "5000");
    await userEvent.click(screen.getByRole("button", { name: /Analyze/i }));

    const generateBtn = await screen.findByRole("button", { name: /Generate Insights/i });
    expect(generateBtn).toBeInTheDocument();

    // AI Insights section kicker/title is visible
    expect(screen.getAllByText(/AI Insights/i).length).toBeGreaterThan(0);
  });
});
