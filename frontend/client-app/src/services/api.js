import axios from 'axios';
import { auth } from '../config/firebase';

// API Gateway URL - Replace with your actual Cloud Run URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to all requests (optional for search)
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

// API functions for Client Service
export const searchAPI = {
  // Search hotels
  searchHotels: (params) => api.get('/api/v1/search/hotels', { params }),
  
  // Get hotel details
  getHotelDetails: (id) => api.get(`/api/v1/search/hotels/${id}`),
  
  // Get room details with availability
  getRoomDetails: (id, params) => api.get(`/api/v1/search/rooms/${id}`, { params }),
};

export const bookingAPI = {
  // Create booking
  createBooking: (data) => api.post('/api/v1/bookings', data),
  
  // Get user's bookings
  getBookings: (params) => api.get('/api/v1/bookings', { params }),
  
  // Get booking details
  getBookingDetails: (id) => api.get(`/api/v1/bookings/${id}`),
  
  // Cancel booking
  cancelBooking: (id) => api.put(`/api/v1/bookings/${id}/cancel`),
};

export const userAPI = {
  // Get user profile
  getProfile: () => api.get('/api/v1/user/profile'),
  
  // Update user profile
  updateProfile: (data) => api.put('/api/v1/user/profile', data),
};

export default api;
