import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const AdminPrivateRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isAdmin, setIsAdmin] = useState(null);
  const location = useLocation();
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        return;
      }

      try {
        // Add token to axios default headers
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Verify token with backend
        const response = await axios.get('/api/admin/auth/verify');
        setIsAuthenticated(true);
        setIsAdmin(response.data.isAdmin);
      } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('adminToken');
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
    };

    verifyToken();
  }, [token]);

  // Show loading state while verifying
  if (isAuthenticated === null || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated or not admin
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Setup axios interceptor for token refresh
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // If error is 401 and we haven't tried to refresh token yet
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Try to refresh token
          const response = await axios.post('/api/admin/auth/refresh');
          const { token } = response.data;

          // Update token in localStorage and axios headers
          localStorage.setItem('adminToken', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          // Retry original request
          return axios(originalRequest);
        } catch (refreshError) {
          // If refresh fails, logout user
          localStorage.removeItem('adminToken');
          setIsAuthenticated(false);
          setIsAdmin(false);
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  // Setup periodic token refresh (every 15 minutes)
  useEffect(() => {
    const refreshToken = async () => {
      try {
        const response = await axios.post('/api/admin/auth/refresh');
        const { token } = response.data;
        localStorage.setItem('adminToken', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.error('Token refresh failed:', error);
        localStorage.removeItem('adminToken');
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
    };

    const intervalId = setInterval(refreshToken, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(intervalId);
  }, []);

  // Setup axios interceptor for error handling
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle session expiration
        if (error.response?.status === 401) {
          localStorage.removeItem('adminToken');
          setIsAuthenticated(false);
          setIsAdmin(false);
        }
        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  // Render protected route if authenticated and admin
  return children;
};

export default AdminPrivateRoute;
