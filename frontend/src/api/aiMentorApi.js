import { fastapiClient } from "./client";

const AI_TIMEOUT = 45000;

export const listConversations = async () => {
  const res = await fastapiClient.get("/ai/conversations");
  return res.data;
};

export const getMessages = async (conversationId) => {
  const res = await fastapiClient.get(`/ai/conversations/${conversationId}/messages`);
  return res.data;
};

export const deleteConversation = async (conversationId) => {
  await fastapiClient.delete(`/ai/conversations/${conversationId}`);
};

export const explainChartMentor = async (payload, signal) => {
  const res = await fastapiClient.post("/ai/explain-chart", payload, {
    signal,
    timeout: AI_TIMEOUT,
  });
  return res.data;
};

export const chat = async (payload, signal) => {
  const res = await fastapiClient.post("/ai/chat", payload, {
    signal,
    timeout: AI_TIMEOUT,
  });
  return res.data;
};

export const suggestNext = async (payload, signal) => {
  const res = await fastapiClient.post("/ai/suggest-next", payload, {
    signal,
    timeout: AI_TIMEOUT,
  });
  return res.data;
};

export const reportSummary = async (payload, signal) => {
  const res = await fastapiClient.post("/ai/report-summary", payload, {
    signal,
    timeout: AI_TIMEOUT,
  });
  return res.data;
};

export const reindex = async () => {
  const res = await fastapiClient.post("/ai/reindex");
  return res.data;
};
