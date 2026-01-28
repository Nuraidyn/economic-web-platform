import axios from "axios";

export const djangoClient = axios.create({
  baseURL: import.meta.env.VITE_DJANGO_URL || "http://127.0.0.1:8000/api",
  timeout: 12000,
});

export const fastapiClient = axios.create({
  baseURL: import.meta.env.VITE_FASTAPI_URL || "http://127.0.0.1:8001/api/v1",
  timeout: 12000,
});

export const setAuthToken = (token) => {
  if (token) {
    djangoClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    fastapiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete djangoClient.defaults.headers.common.Authorization;
    delete fastapiClient.defaults.headers.common.Authorization;
  }
};
