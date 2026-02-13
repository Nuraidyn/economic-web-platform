import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../api/analyticsApi", () => ({
  listCountries: vi.fn(async () => [
    { id: 1, code: "KZ", name: "Kazakhstan" },
    { id: 2, code: "US", name: "United States" },
  ]),
  listIndicators: vi.fn(async () => [
    { id: 1, code: "FP.CPI.TOTL.ZG", name: "Inflation (annual %)" },
  ]),
}));

import { listCountries, listIndicators } from "../../api/analyticsApi";
import { AnalysisProvider, useAnalysis } from "../AnalysisContext";

const wrapper = ({ children }) => <AnalysisProvider>{children}</AnalysisProvider>;

describe("AnalysisContext", () => {
  it("loads catalog and clamps years within safe bounds", async () => {
    const { result } = renderHook(() => useAnalysis(), { wrapper });

    await waitFor(() => {
      expect(result.current.catalogStatus.loading).toBe(false);
    });

    expect(listCountries).toHaveBeenCalledTimes(1);
    expect(listIndicators).toHaveBeenCalledTimes(1);

    const { minAnalysisYear, maxAnalysisYear } = result.current;

    act(() => {
      result.current.setStartYear(minAnalysisYear - 25);
      result.current.setEndYear(maxAnalysisYear + 25);
    });

    expect(result.current.startYear).toBe(minAnalysisYear);
    expect(result.current.endYear).toBe(maxAnalysisYear);
  });

  it("applies preset payload and fixes reversed year range", async () => {
    const { result } = renderHook(() => useAnalysis(), { wrapper });

    await waitFor(() => {
      expect(result.current.catalogStatus.loading).toBe(false);
    });

    const maxYear = result.current.maxAnalysisYear;

    act(() => {
      result.current.applyPresetPayload({
        selectedCountries: ["KZ", "US"],
        selectedIndicators: ["FP.CPI.TOTL.ZG"],
        chartType: "bar",
        startYear: maxYear,
        endYear: maxYear - 5,
      });
    });

    expect(result.current.selectedCountries).toEqual(["KZ", "US"]);
    expect(result.current.selectedIndicators).toEqual(["FP.CPI.TOTL.ZG"]);
    expect(result.current.chartType).toBe("bar");
    expect(result.current.startYear).toBe(maxYear - 5);
    expect(result.current.endYear).toBe(maxYear);
  });
});
