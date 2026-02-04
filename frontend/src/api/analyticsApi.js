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

export const fetchObservationsWithMeta = async (params) => {
  const res = await fastapiClient.get("/observations", { params });
  return {
    data: res.data,
    meta: {
      source: res.headers["x-data-source"] || "unknown",
      fetchedAt: res.headers["x-fetched-at"] || null,
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

export const createForecast = async ({ country, indicator, horizon_years }) => {
  const res = await fastapiClient.post("/forecast", null, {
    params: { country, indicator, horizon_years },
  });
  return res.data;
};

export const fetchLatestForecast = async ({ country, indicator }) => {
  const res = await fastapiClient.get("/forecast/latest", { params: { country, indicator } });
  return res.data;
};
