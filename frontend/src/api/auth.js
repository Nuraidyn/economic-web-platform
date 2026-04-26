import { djangoClient, djangoPublicClient } from "./client";

export const fetchActiveAgreement = async () => {
  const res = await djangoPublicClient.get("/agreements/active");
  if (res.data && res.data.active === false) return null;
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

// Cookie-based silent refresh — no body needed, the httpOnly cookie is sent automatically.
export const silentRefresh = async () => {
  const res = await djangoPublicClient.post("/auth/token/refresh");
  return res.data;  // { access: "..." }
};

export const logoutUser = async () => {
  await djangoPublicClient.post("/auth/logout");
};

export const fetchMe = async () => {
  const res = await djangoClient.get("/auth/me");
  return res.data;
};

export const acceptAgreement = async () => {
  const res = await djangoClient.post("/agreements/accept");
  return res.data;
};

export const verifyEmail = async (token) => {
  const res = await djangoPublicClient.post("/auth/verify-email", { token });
  return res.data;
};

export const resendVerification = async (payload) => {
  const res = await djangoPublicClient.post("/auth/resend-verification", payload);
  return res.data;
};

export const googleAuth = async (credential) => {
  const res = await djangoPublicClient.post("/auth/google", { credential });
  return res.data;
};

export const forgotPassword = async (email) => {
  const res = await djangoPublicClient.post("/auth/password/forgot", { email });
  return res.data;
};

export const resetPassword = async (token, new_password) => {
  const res = await djangoPublicClient.post("/auth/password/reset", { token, new_password });
  return res.data;
};
