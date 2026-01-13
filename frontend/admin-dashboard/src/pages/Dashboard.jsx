import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { hotelAPI } from '../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rooms'); // rooms, availability, predict

  // Form states
  const [availabilityForm, setAvailabilityForm] = useState({
    room_id: '',
    start_date: '',
    end_date: '',
    available_count: 1,
    price_override: '',
  });

  const [predictionForm, setPredictionForm] = useState({
    city: '',
    star_rating: 3,
    room_type: 'DOUBLE',
    date: new Date().toISOString().split('T')[0],
    weekend: false,
    holiday: false,
  });

  const [predictedPrice, setPredictedPrice] = useState(null);

  useEffect(() => {
    fetchHotels();
  }, []);

  useEffect(() => {
    if (selectedHotel) {
      fetchRooms(selectedHotel.id);
    }
  }, [selectedHotel]);

  const fetchHotels = async () => {
    try {
      const response = await hotelAPI.getHotels({ limit: 100 });
      setHotels(response.data.data || []);
      if (response.data.data?.length > 0) {
        setSelectedHotel(response.data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching hotels:', error);
      toast.error('Oteller yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async (hotelId) => {
    try {
      const response = await hotelAPI.getRooms({ hotel_id: hotelId, limit: 100 });
      setRooms(response.data.data || []);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Odalar yüklenemedi');
    }
  };

  const handleSetAvailability = async (e) => {
    e.preventDefault();
    try {
      await hotelAPI.setAvailability({
        ...availabilityForm,
        available_count: parseInt(availabilityForm.available_count),
        price_override: availabilityForm.price_override 
          ? parseFloat(availabilityForm.price_override) 
          : undefined,
      });
      toast.success('Müsaitlik başarıyla güncellendi');
      setAvailabilityForm({
        room_id: '',
        start_date: '',
        end_date: '',
        available_count: 1,
        price_override: '',
      });
    } catch (error) {
      console.error('Error setting availability:', error);
      toast.error(error.response?.data?.error || 'Müsaitlik güncellenemedi');
    }
  };

  const handlePredictPrice = async (e) => {
    e.preventDefault();
    try {
      const response = await hotelAPI.predictPrice({
        ...predictionForm,
        star_rating: parseInt(predictionForm.star_rating),
        weekend: predictionForm.weekend ? 'true' : 'false',
        holiday: predictionForm.holiday ? 'true' : 'false',
      });
      setPredictedPrice(response.data);
      toast.success('Fiyat tahmini alındı');
    } catch (error) {
      console.error('Error predicting price:', error);
      toast.error('Fiyat tahmini alınamadı');
    }
  };

  const roomTypes = ['SINGLE', 'DOUBLE', 'SUITE', 'DELUXE', 'FAMILY'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Hotel Management System</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {user?.picture ? (
                  <img 
                    src={user.picture} 
                    alt={user.name} 
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 font-medium">
                      {user?.email?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm text-gray-600">{user?.email}</span>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hotel Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Otel Seçin
          </label>
          <select
            value={selectedHotel?.id || ''}
            onChange={(e) => {
              const hotel = hotels.find(h => h.id === e.target.value);
              setSelectedHotel(hotel);
            }}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {hotels.map((hotel) => (
              <option key={hotel.id} value={hotel.id}>
                {hotel.name} - {hotel.city}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('rooms')}
                className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'rooms'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Odalar
              </button>
              <button
                onClick={() => setActiveTab('availability')}
                className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'availability'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Müsaitlik Yönetimi
              </button>
              <button
                onClick={() => setActiveTab('predict')}
                className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'predict'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                ML Fiyat Tahmini
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Rooms Tab */}
            {activeTab === 'rooms' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  {selectedHotel?.name} - Odalar
                </h2>
                
                {rooms.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Bu otele ait oda bulunamadı.
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {rooms.map((room) => (
                      <div
                        key={room.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-gray-800">{room.name}</h3>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            room.room_type === 'SUITE' 
                              ? 'bg-purple-100 text-purple-700'
                              : room.room_type === 'DELUXE'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {room.room_type}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>Kapasite:</span>
                            <span className="font-medium">{room.capacity} kişi</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Taban Fiyat:</span>
                            <span className="font-medium text-green-600">
                              ₺{parseFloat(room.base_price).toLocaleString('tr-TR')}
                            </span>
                          </div>
                          {room.size_sqm && (
                            <div className="flex justify-between">
                              <span>Boyut:</span>
                              <span className="font-medium">{room.size_sqm} m²</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Availability Tab */}
            {activeTab === 'availability' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Müsaitlik Güncelle
                </h2>
                
                <form onSubmit={handleSetAvailability} className="max-w-2xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Oda Seçin
                      </label>
                      <select
                        value={availabilityForm.room_id}
                        onChange={(e) => setAvailabilityForm({
                          ...availabilityForm,
                          room_id: e.target.value,
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      >
                        <option value="">Oda seçin...</option>
                        {rooms.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name} ({room.room_type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Başlangıç Tarihi
                      </label>
                      <input
                        type="date"
                        value={availabilityForm.start_date}
                        onChange={(e) => setAvailabilityForm({
                          ...availabilityForm,
                          start_date: e.target.value,
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bitiş Tarihi
                      </label>
                      <input
                        type="date"
                        value={availabilityForm.end_date}
                        onChange={(e) => setAvailabilityForm({
                          ...availabilityForm,
                          end_date: e.target.value,
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Müsait Oda Sayısı
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={availabilityForm.available_count}
                        onChange={(e) => setAvailabilityForm({
                          ...availabilityForm,
                          available_count: e.target.value,
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fiyat Geçersiz Kılma (Opsiyonel)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={availabilityForm.price_override}
                        onChange={(e) => setAvailabilityForm({
                          ...availabilityForm,
                          price_override: e.target.value,
                        })}
                        placeholder="Boş bırakılırsa taban fiyat kullanılır"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Müsaitliği Kaydet
                  </button>
                </form>
              </div>
            )}

            {/* ML Prediction Tab */}
            {activeTab === 'predict' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  ML ile Fiyat Tahmini
                </h2>

                <div className="grid lg:grid-cols-2 gap-8">
                  <form onSubmit={handlePredictPrice} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Şehir
                      </label>
                      <input
                        type="text"
                        value={predictionForm.city}
                        onChange={(e) => setPredictionForm({
                          ...predictionForm,
                          city: e.target.value,
                        })}
                        placeholder="örn: Istanbul, Paris, London"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Yıldız Sayısı
                      </label>
                      <select
                        value={predictionForm.star_rating}
                        onChange={(e) => setPredictionForm({
                          ...predictionForm,
                          star_rating: e.target.value,
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        {[1, 2, 3, 4, 5].map((star) => (
                          <option key={star} value={star}>
                            {star} Yıldız
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Oda Tipi
                      </label>
                      <select
                        value={predictionForm.room_type}
                        onChange={(e) => setPredictionForm({
                          ...predictionForm,
                          room_type: e.target.value,
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        {roomTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tarih
                      </label>
                      <input
                        type="date"
                        value={predictionForm.date}
                        onChange={(e) => setPredictionForm({
                          ...predictionForm,
                          date: e.target.value,
                        })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={predictionForm.weekend}
                          onChange={(e) => setPredictionForm({
                            ...predictionForm,
                            weekend: e.target.checked,
                          })}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">Hafta sonu</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={predictionForm.holiday}
                          onChange={(e) => setPredictionForm({
                            ...predictionForm,
                            holiday: e.target.checked,
                          })}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">Tatil günü</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-primary-600 hover:from-purple-700 hover:to-primary-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Fiyat Tahmin Et
                    </button>
                  </form>

                  {/* Prediction Result */}
                  {predictedPrice && (
                    <div className="bg-gradient-to-br from-purple-50 to-primary-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Tahmin Sonucu
                      </h3>
                      
                      <div className="bg-white rounded-lg p-6 shadow-sm mb-4">
                        <div className="text-center">
                          <p className="text-sm text-gray-500 mb-1">Önerilen Fiyat</p>
                          <p className="text-4xl font-bold text-primary-600">
                            ₺{predictedPrice.predicted_price?.toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Güven Oranı:</span>
                          <span className="font-medium">
                            %{((predictedPrice.confidence || 0) * 100).toFixed(0)}
                          </span>
                        </div>
                        
                        {predictedPrice.factors && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm font-medium text-gray-700 mb-2">Faktörler:</p>
                            <div className="space-y-1 text-xs text-gray-600">
                              {Object.entries(predictedPrice.factors).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span>{key.replace(/_/g, ' ')}:</span>
                                  <span>{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
