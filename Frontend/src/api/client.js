import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('crm_access_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for automatic refresh / error handling
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loop on auth endpoints
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await axios.post(
          '/api/v1/auth/refresh',
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data?.data?.accessToken;
        if (newAccessToken) {
          localStorage.setItem('crm_access_token', newAccessToken);
          localStorage.setItem('token', newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        localStorage.removeItem('crm_access_token');
        localStorage.removeItem('token');
        localStorage.removeItem('crm_user');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }

    const message =
      error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject({ ...error, customMessage: message });
  }
);

export default api;
