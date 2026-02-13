import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import IndicatorMultiSelect from "../IndicatorMultiSelect";
import { I18nProvider } from "../../context/I18nContext";

function renderWithI18n(ui) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe("IndicatorMultiSelect", () => {
  const indicators = [
    { code: "SI.POV.GINI", label: "Gini Index" },
    { code: "FP.CPI.TOTL.ZG", label: "Inflation (annual %)" },
    { code: "SL.UEM.TOTL.ZS", label: "Unemployment rate" },
    { code: "NY.GDP.MKTP.CD", label: "GDP" },
    { code: "NY.GDP.PCAP.CD", label: "GDP per capita" },
  ];

  it("adds an indicator when clicking an unchecked checkbox", async () => {
    const onChange = vi.fn();

    renderWithI18n(
      <IndicatorMultiSelect
        indicators={indicators}
        selected={[]}
        onChange={onChange}
        maxSelection={4}
      />
    );

    const giniCheckbox = screen.getByRole("checkbox", { name: /Gini Index/i });
    await userEvent.click(giniCheckbox);

    expect(onChange).toHaveBeenCalledWith(["SI.POV.GINI"]);
  });

  it("prevents selection over the max and emits warning callback", async () => {
    const onChange = vi.fn();
    const onLimitReached = vi.fn();

    renderWithI18n(
      <IndicatorMultiSelect
        indicators={indicators}
        selected={["SI.POV.GINI", "FP.CPI.TOTL.ZG", "SL.UEM.TOTL.ZS", "NY.GDP.MKTP.CD"]}
        onChange={onChange}
        maxSelection={4}
        onLimitReached={onLimitReached}
      />
    );

    const gdpCapCheckbox = screen.getByRole("checkbox", { name: /GDP per capita/i });
    await userEvent.click(gdpCapCheckbox);

    expect(onChange).not.toHaveBeenCalled();
    expect(onLimitReached).toHaveBeenCalledTimes(1);
    expect(onLimitReached.mock.calls[0][0]).toContain("4");
  });
});
