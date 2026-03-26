import { fastapiClient } from "./client";

export const fetchNews = async () => {
  const res = await fastapiClient.get("/news");
  return res.data;
};
