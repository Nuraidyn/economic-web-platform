import { djangoClient } from "./client";

export const fetchActiveAgreement = async () => {
  const res = await djangoClient.get("/agreements/active");
  return res.data;
};

export const registerUser = async (payload) => {
  const res = await djangoClient.post("/auth/register", payload);
  return res.data;
};

export const loginUser = async (payload) => {
  const res = await djangoClient.post("/auth/token", payload);
  return res.data;
};

export const refreshToken = async (payload) => {
  const res = await djangoClient.post("/auth/token/refresh", payload);
  return res.data;
};

export const fetchMe = async () => {
  const res = await djangoClient.get("/auth/me");
  return res.data;
};

export const acceptAgreement = async () => {
  const res = await djangoClient.post("/agreements/accept");
  return res.data;
};
