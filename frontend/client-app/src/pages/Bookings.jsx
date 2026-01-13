import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const Bookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  const fetchBookings = async () => {
    try {
      const params = filter !== 'all' ? { status: filter.toUpperCase() } : {};
      const response = await bookingAPI.getBookings(params);
      setBookings(response.data.data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Rezervasyonlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Bu rezervasyonu iptal etmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      await bookingAPI.cancelBooking(bookingId);
      toast.success('Rezervasyon iptal edildi');
      fetchBookings();
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error(error.response?.data?.error || 'Rezervasyon iptal edilemedi');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Beklemede' },
      CONFIRMED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Onaylandı' },
      CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', label: 'İptal Edildi' },
      COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Tamamlandı' },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Rezervasyonlarım</h1>
            <p className="text-gray-500">Tüm otel rezervasyonlarınızı buradan takip edin</p>
          </div>

          {/* Filter */}
          <div className="flex gap-2">
            {['all', 'confirmed', 'pending', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-brand-red text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {status === 'all' ? 'Tümü' : 
                 status === 'confirmed' ? 'Onaylı' :
                 status === 'pending' ? 'Beklemede' : 'İptal'}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-red border-t-transparent"></div>
          </div>
        )}

        {/* Bookings List */}
        {!loading && bookings.length > 0 && (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const images = booking.hotel_images || [];
              const mainImage = images[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400';

              return (
                <div key={booking.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    {/* Image */}
                    <div className="md:w-48 h-48 md:h-auto flex-shrink-0">
                      <img
                        src={mainImage}
                        alt={booking.hotel_name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-800">
                              {booking.hotel_name}
                            </h3>
                            {getStatusBadge(booking.status)}
                          </div>

                          <p className="text-gray-600 mb-3">
                            {booking.room_name} • {booking.room_type}
                          </p>

                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div>
                              <span className="text-gray-500">Giriş:</span>
                              <span className="ml-2 font-medium">
                                {format(new Date(booking.check_in), 'd MMMM yyyy', { locale: tr })}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Çıkış:</span>
                              <span className="ml-2 font-medium">
                                {format(new Date(booking.check_out), 'd MMMM yyyy', { locale: tr })}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Misafir:</span>
                              <span className="ml-2 font-medium">{booking.guests} kişi</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Konum:</span>
                              <span className="ml-2 font-medium">{booking.hotel_city}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-bold text-brand-red">
                            ₺{parseFloat(booking.total_price || 0).toLocaleString('tr-TR')}
                          </p>
                          <p className="text-sm text-gray-500">Toplam</p>

                          {booking.status === 'PENDING' || booking.status === 'CONFIRMED' ? (
                            <button
                              onClick={() => handleCancelBooking(booking.id)}
                              className="mt-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              İptal Et
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && bookings.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl">
            <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Henüz rezervasyonunuz yok</h3>
            <p className="text-gray-500 mb-6">
              Hayalinizdeki oteli bulun ve ilk rezervasyonunuzu yapın!
            </p>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-red hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Otel Ara
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Bookings;
