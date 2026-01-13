import axios from 'axios';
import { auth, signOut } from '../config/firebase';

// API Gateway URL - Replace with your actual Cloud Run URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to all requests
api.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await signOut(auth);
      } catch (e) {
        console.error('Error signing out after 401:', e);
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API functions for Admin Service
export const hotelAPI = {
  // Hotels
  getHotels: (params) => api.get('/api/v1/hotels', { params }),
  getHotel: (id) => api.get(`/api/v1/hotels/${id}`),
  createHotel: (data) => api.post('/api/v1/hotels', data),
  updateHotel: (id, data) => api.put(`/api/v1/hotels/${id}`, data),
  deleteHotel: (id) => api.delete(`/api/v1/hotels/${id}`),
  
  // Rooms
  getRooms: (params) => api.get('/api/v1/rooms', { params }),
  getRoom: (id) => api.get(`/api/v1/rooms/${id}`),
  createRoom: (data) => api.post('/api/v1/rooms', data),
  updateRoom: (id, data) => api.put(`/api/v1/rooms/${id}`, data),
  deleteRoom: (id) => api.delete(`/api/v1/rooms/${id}`),
  
  // Availability
  getAvailability: (params) => api.get('/api/v1/availability', { params }),
  setAvailability: (data) => api.post('/api/v1/availability', data),
  bulkUpdateAvailability: (updates) => api.put('/api/v1/availability/bulk', { updates }),
  
  // Price Prediction
  predictPrice: (params) => api.get('/api/v1/price/predict', { params }),
  batchPredictPrice: (predictions) => api.post('/api/v1/price/batch-predict', { predictions }),
};

export default api;
