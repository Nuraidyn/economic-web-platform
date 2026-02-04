import { djangoClient } from "./client";

export const listPresets = async () => {
  const res = await djangoClient.get("/presets");
  return res.data;
};

export const createPreset = async ({ name, payload }) => {
  const res = await djangoClient.post("/presets", { name, payload });
  return res.data;
};

export const updatePreset = async ({ id, name, payload }) => {
  const res = await djangoClient.put(`/presets/${id}`, { name, payload });
  return res.data;
};

export const deletePreset = async (id) => {
  const res = await djangoClient.delete(`/presets/${id}`);
  return res.data;
};

