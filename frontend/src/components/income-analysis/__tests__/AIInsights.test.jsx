import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../api/analyticsApi", () => ({
  fetchIncomeInsights: vi.fn(),
}));

import { fetchIncomeInsights } from "../../../api/analyticsApi";
import AIInsights from "../AIInsights";
import { I18nProvider } from "../../../context/I18nContext";

const FORM_DATA = {
  age: 30,
  country: "Kazakhstan",
  profession: "Software Engineer",
  experienceYears: 5,
  monthlyIncome: 3000,
  monthlyExpenses: 1800,
  growthPct: 10,
  currency: "USD",
};

const MOCK_RESPONSE = {
  summary: "Test summary text",
  income_benchmark: ["Benchmark A", "Benchmark B"],
  action_plan: {
    next_3_months: ["Action 3m"],
    next_6_months: ["Action 6m"],
    next_12_months: ["Action 12m"],
  },
  potential_countries: [
    { country: "Germany", reason: "High demand", estimated_income_range: "Varies" },
  ],
  disclaimer: "This is for educational purposes only.",
  provider: "openai",
};

function renderInsights(props = {}) {
  return render(
    <I18nProvider>
      <AIInsights formData={FORM_DATA} {...props} />
    </I18nProvider>
  );
}

describe("AIInsights", () => {
  beforeEach(() => {
    window.localStorage.setItem("ewp_language", "en");
    vi.clearAllMocks();
  });

  it("renders generate button initially", () => {
    renderInsights();
    expect(screen.getByRole("button", { name: /Generate Insights/i })).toBeInTheDocument();
  });

  it("shows loading spinner while fetching", async () => {
    fetchIncomeInsights.mockImplementation(() => new Promise(() => {}));
    renderInsights();
    await userEvent.click(screen.getByRole("button", { name: /Generate Insights/i }));
    expect(document.querySelector("[aria-busy='true']")).toBeInTheDocument();
  });

  it("shows loading text while fetching", async () => {
    fetchIncomeInsights.mockImplementation(() => new Promise(() => {}));
    renderInsights();
    await userEvent.click(screen.getByRole("button", { name: /Generate Insights/i }));
    expect(screen.getByText(/Generating/i)).toBeInTheDocument();
  });

  it("renders summary after successful fetch", async () => {
    fetchIncomeInsights.mockResolvedValue(MOCK_RESPONSE);
    renderInsights();
    await userEvent.click(screen.getByRole("button", { name: /Generate Insights/i }));
    await waitFor(() => expect(screen.getByText("Test summary text")).toBeInTheDocument());
  });

  it("renders income benchmarks after successful fetch", async () => {
    fetchIncomeInsights.mockResolvedValue(MOCK_RESPONSE);
    renderInsights();
    await userEvent.click(screen.getByRole("button", { name: /Generate Insights/i }));
    await waitFor(() => {
      expect(screen.getByText("Benchmark A")).toBeInTheDocument();
      expect(screen.getByText("Benchmark B")).toBeInTheDocument();
    });
  });

  it("renders action plan steps after successful fetch", async () => {
    fetchIncomeInsights.mockResolvedValue(MOCK_RESPONSE);
    renderInsights();
    await userEvent.click(screen.getByRole("button", { name: /Generate Insights/i }));
    await waitFor(() => {
      expect(screen.getByText("Action 3m")).toBeInTheDocument();
      expect(screen.getByText("Action 6m")).toBeInTheDocument();
      expect(screen.getByText("Action 12m")).toBeInTheDocument();
    });
  });

  it("renders potential countries after successful fetch", async () => {
    fetchIncomeInsights.mockResolvedValue(MOCK_RESPONSE);
    renderInsights();
    await userEvent.click(screen.getByRole("button", { name: /Generate Insights/i }));
    await waitFor(() => expect(screen.getByText("Germany")).toBeInTheDocument());
  });

  it("renders provider badge with correct provider name", async () => {
    fetchIncomeInsights.mockResolvedValue(MOCK_RESPONSE);
    renderInsights();
    await userEvent.click(screen.getByRole("button", { name: /Generate Insights/i }));
    await waitFor(() => expect(screen.getByText("OpenAI")).toBeInTheDocument());
  });

  it("renders fallback provider badge for offline provider", async () => {
    fetchIncomeInsights.mockResolvedValue({ ...MOCK_RESPONSE, provider: "fallback" });
    renderInsights();
    await userEvent.click(screen.getByRole("button", { name: /Generate Insights/i }));
    await waitFor(() => expect(screen.getByText("Offline")).toBeInTheDocument());
  });

  it("renders disclaimer text", async () => {
    fetchIncomeInsights.mockResolvedValue(MOCK_RESPONSE);
    renderInsights();
    await userEvent.click(screen.getByRole("button", { name: /Generate Insights/i }));
    await waitFor(() =>
      expect(screen.getByText(/educational purposes only/i)).toBeInTheDocument()
    );
  });

  it("shows error message on fetch failure", async () => {
    fetchIncomeInsights.mockRejectedValue(new Error("Network error"));
    renderInsights();
    await userEvent.click(screen.getByRole("button", { name: /Generate Insights/i }));
    await waitFor(() =>
      expect(screen.getByText(/Failed to generate insights/i)).toBeInTheDocument()
    );
  });

  it("shows retry button on error", async () => {
    fetchIncomeInsights.mockRejectedValue(new Error("Network error"));
    renderInsights();
    await userEvent.click(screen.getByRole("button", { name: /Generate Insights/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument()
    );
  });

  it("retry button triggers another fetch", async () => {
    fetchIncomeInsights.mockRejectedValueOnce(new Error("fail"));
    fetchIncomeInsights.mockResolvedValue(MOCK_RESPONSE);
    renderInsights();
    await userEvent.click(screen.getByRole("button", { name: /Generate Insights/i }));
    await waitFor(() => screen.getByRole("button", { name: /Retry/i }));
    await userEvent.click(screen.getByRole("button", { name: /Retry/i }));
    await waitFor(() => expect(screen.getByText("Test summary text")).toBeInTheDocument());
    expect(fetchIncomeInsights).toHaveBeenCalledTimes(2);
  });

  it("calls fetchIncomeInsights with correct payload shape", async () => {
    fetchIncomeInsights.mockResolvedValue(MOCK_RESPONSE);
    renderInsights();
    await userEvent.click(screen.getByRole("button", { name: /Generate Insights/i }));
    await waitFor(() => expect(fetchIncomeInsights).toHaveBeenCalledTimes(1));
    const [payload] = fetchIncomeInsights.mock.calls[0];
    expect(payload).toMatchObject({
      age: 30,
      country: "Kazakhstan",
      profession: "Software Engineer",
      experience_years: 5,
      monthly_income: 3000,
      monthly_expenses: 1800,
    });
  });
});
