import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/analyticsApi", () => ({
  explainChart: vi.fn(),
}));

import { explainChart } from "../../api/analyticsApi";
import ChartInsightAgent from "../ChartInsightAgent";
import { I18nProvider } from "../../context/I18nContext";

function renderAgent(props) {
  return render(
    <I18nProvider>
      <ChartInsightAgent {...props} />
    </I18nProvider>
  );
}

describe("ChartInsightAgent", () => {
  beforeEach(() => {
    window.localStorage.setItem("ewp_language", "en");
  });

  it("sends chart payload with selected language and renders AI response", async () => {
    explainChart.mockResolvedValue({
      answer: "Trend is mostly stable with moderate volatility.",
      provider: "local-fallback",
      model: null,
      warning: "OPENAI_API_KEY is not configured",
    });

    renderAgent({
      datasets: [
        {
          indicator: "FP.CPI.TOTL.ZG",
          series: [
            {
              country: "KZ",
              data: [
                { year: 2006, value: 8.72 },
                { year: 2024, value: 8.84 },
              ],
            },
          ],
        },
      ],
      indicators: [{ code: "FP.CPI.TOTL.ZG", label: "Inflation (annual %)" }],
      startYear: 2006,
      endYear: 2024,
    });

    await userEvent.click(screen.getByRole("button", { name: /Explain chart/i }));

    await waitFor(() => {
      expect(explainChart).toHaveBeenCalledTimes(1);
    });

    expect(explainChart).toHaveBeenCalledWith(
      expect.objectContaining({
        language: "en",
        start_year: 2006,
        end_year: 2024,
        datasets: [
          {
            indicator: "FP.CPI.TOTL.ZG",
            indicator_label: "Inflation (annual %)",
            series: [
              {
                country: "KZ",
                data: [
                  { year: 2006, value: 8.72 },
                  { year: 2024, value: 8.84 },
                ],
              },
            ],
          },
        ],
      })
    );

    expect(screen.getByText(/Trend is mostly stable/i)).toBeInTheDocument();
    expect(screen.getByText(/Provider: local-fallback/i)).toBeInTheDocument();
  });

  it("shows validation error when user asks without chart data", async () => {
    renderAgent({
      datasets: [],
      indicators: [],
      startYear: 2006,
      endYear: 2024,
    });

    await userEvent.click(screen.getByRole("button", { name: /Explain chart/i }));

    expect(
      screen.getByText(/Run comparison first and enter a question for the AI agent/i)
    ).toBeInTheDocument();
    expect(explainChart).not.toHaveBeenCalled();
  });
});
