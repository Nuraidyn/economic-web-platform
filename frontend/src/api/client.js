import axios from "axios";

export const djangoClient = axios.create({
  baseURL: import.meta.env.VITE_DJANGO_URL || "http://127.0.0.1:8000/api",
  timeout: 12000,
  withCredentials: true,  // send httpOnly refresh cookie to Django
});

// Public Django client — used for auth endpoints that don't need Bearer token.
// withCredentials is required so the refresh cookie is sent on token/refresh calls.
export const djangoPublicClient = axios.create({
  baseURL: import.meta.env.VITE_DJANGO_URL || "http://127.0.0.1:8000/api",
  timeout: 12000,
  withCredentials: true,
});

export const fastapiClient = axios.create({
  baseURL: import.meta.env.VITE_FASTAPI_URL || "http://127.0.0.1:8001/api/v1",
  timeout: 15000,
  // No withCredentials: FastAPI only reads the Bearer access token from header.
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

// ── Silent-refresh interceptor ────────────────────────────────────────────────
// When any authenticated request returns 401, automatically try to refresh the
// access token using the httpOnly cookie, then retry the original request once.
// A module-level flag prevents parallel refresh storms.

let _isRefreshing = false;
let _waitQueue = [];

const _drainQueue = (error, token) => {
  _waitQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
  _waitQueue = [];
};

const _addRefreshInterceptor = (client) => {
  client.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config;

      // Only retry on 401 from a request that hasn't been retried yet,
      // and never retry the refresh endpoint itself (avoids infinite loop).
      const isRefreshEndpoint = original?.url?.includes("/auth/token/refresh");
      if (error.response?.status !== 401 || original._retry || isRefreshEndpoint) {
        return Promise.reject(error);
      }

      if (_isRefreshing) {
        return new Promise((resolve, reject) => {
          _waitQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return client(original);
        });
      }

      original._retry = true;
      _isRefreshing = true;

      try {
        const res = await djangoPublicClient.post("/auth/token/refresh");
        const { access } = res.data;
        setAuthToken(access);
        _drainQueue(null, access);
        original.headers.Authorization = `Bearer ${access}`;
        return client(original);
      } catch (refreshError) {
        _drainQueue(refreshError, null);
        setAuthToken(null);
        return Promise.reject(refreshError);
      } finally {
        _isRefreshing = false;
      }
    }
  );
};

_addRefreshInterceptor(djangoClient);
_addRefreshInterceptor(fastapiClient);
