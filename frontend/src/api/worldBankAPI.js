import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000/api/data";

export const LORENZ_SEGMENTS = [
  { code: "SI.DST.FRST.20", label: "Lowest 20%", populationShare: 0.2 },
  { code: "SI.DST.02ND.20", label: "Second 20%", populationShare: 0.2 },
  { code: "SI.DST.03RD.20", label: "Third 20%", populationShare: 0.2 },
  { code: "SI.DST.04TH.20", label: "Fourth 20%", populationShare: 0.2 },
  { code: "SI.DST.05TH.20", label: "Highest 20%", populationShare: 0.2 },
];

export const fetchIndicator = async (country, indicator, params = {}) => {
  try {
    const res = await axios.get(BASE_URL, {
      params: { country, indicator, ...params },
      timeout: 12000,
    });
    return res.data;
  } catch (error) {
    console.error("Failed to fetch indicator", error);
    throw new Error(
      error.response?.data?.error || "Unable to load data from the API. Please try again."
    );
  }
};

const pickEntryForYear = (series, targetYear) => {
  if (!Array.isArray(series) || series.length === 0) {
    return null;
  }
  const exact = series.find((row) => row.year === targetYear && row.value != null);
  if (exact) {
    return exact;
  }
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const candidate = series[i];
    if (candidate.value != null) {
      return candidate;
    }
  }
  return null;
};

export const fetchLorenzSegments = async (country, year) => {
  const results = [];
  for (const segment of LORENZ_SEGMENTS) {
    const data = await fetchIndicator(country, segment.code, {
      start: 1960,
      end: year,
    });
    const entry = pickEntryForYear(data, year);
    results.push({
      ...segment,
      incomeShare: entry?.value ?? null,
      dataYear: entry?.year ?? null,
    });
    // World Bank API может обрубать пакет параллельных запросов, поэтому слегка замедляемся.
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return results;
};
