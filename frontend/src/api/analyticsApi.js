import { fastapiClient } from "./client";

export const listCountries = async () => {
  const res = await fastapiClient.get("/countries");
  return res.data;
};

export const listIndicators = async () => {
  const res = await fastapiClient.get("/indicators");
  return res.data;
};

export const fetchObservations = async (params) => {
  const res = await fastapiClient.get("/observations", { params });
  return res.data;
};

export const fetchObservationsWithMeta = async (params, signal) => {
  const res = await fastapiClient.get("/observations", { params, signal });
  return {
    data: res.data,
    meta: {
      source: res.headers["x-data-source"] || "unknown",
      fetchedAt: res.headers["x-fetched-at"] || null,
      empty: res.headers["x-data-empty"] === "true",
    },
  };
};

export const fetchLorenz = async (params) => {
  const res = await fastapiClient.get("/lorenz", { params });
  return res.data;
};

export const fetchGiniTrend = async (params) => {
  const res = await fastapiClient.get("/inequality/gini/trend", { params });
  return res.data;
};

export const fetchGiniRanking = async ({ year, countries }) => {
  const res = await fastapiClient.get("/inequality/gini/ranking", {
    params: { year, countries: countries.join(",") },
  });
  return res.data;
};

export const createForecast = async ({ country, indicator, horizon_years }, signal) => {
  const res = await fastapiClient.post("/forecast", null, {
    params: { country, indicator, horizon_years },
    signal,
  });
  return res.data;
};

export const fetchLatestForecast = async ({ country, indicator }, signal) => {
  const res = await fastapiClient.get("/forecast/latest", { params: { country, indicator }, signal });
  return res.data;
};

export const explainChart = async (payload, signal) => {
  const res = await fastapiClient.post("/analytics/chart/explain", payload, { signal, timeout: 30000 });
  return res.data;
};

export const fetchIncomeInsights = async (payload, signal) => {
  const res = await fastapiClient.post("/income/insights", payload, { signal, timeout: 30000 });
  return res.data;
};
