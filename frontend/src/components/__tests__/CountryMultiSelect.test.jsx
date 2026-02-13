import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import CountryMultiSelect from "../CountryMultiSelect";
import { I18nProvider } from "../../context/I18nContext";

function renderWithI18n(ui) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe("CountryMultiSelect", () => {
  const countries = [
    { code: "KZ", name: "Kazakhstan" },
    { code: "US", name: "United States" },
    { code: "BR", name: "Brazil" },
    { code: "DE", name: "Germany" },
    { code: "FR", name: "France" },
  ];

  it("adds a country when clicking an unchecked checkbox", async () => {
    const onSelect = vi.fn();

    renderWithI18n(
      <CountryMultiSelect
        countries={countries}
        selected={[]}
        onSelect={onSelect}
        maxSelection={4}
      />
    );

    const kzCheckbox = screen.getByRole("checkbox", { name: /Kazakhstan/i });
    await userEvent.click(kzCheckbox);

    expect(onSelect).toHaveBeenCalledWith(["KZ"]);
  });

  it("prevents selection over the max and emits warning callback", async () => {
    const onSelect = vi.fn();
    const onLimitReached = vi.fn();

    renderWithI18n(
      <CountryMultiSelect
        countries={countries}
        selected={["KZ", "US", "DE", "FR"]}
        onSelect={onSelect}
        maxSelection={4}
        onLimitReached={onLimitReached}
      />
    );

    const brCheckbox = screen.getByRole("checkbox", { name: /Brazil/i });
    await userEvent.click(brCheckbox);

    expect(onSelect).not.toHaveBeenCalled();
    expect(onLimitReached).toHaveBeenCalledTimes(1);
    expect(onLimitReached.mock.calls[0][0]).toContain("4");
  });
});
