import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { searchAPI, bookingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import HotelMap from '../components/HotelMap';
import toast from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';

const HotelDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, hasDiscount, discountPercentage } = useAuth();

  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const checkIn = searchParams.get('check_in') || format(new Date(), 'yyyy-MM-dd');
  const checkOut = searchParams.get('check_out') || format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
  const guests = parseInt(searchParams.get('guests') || '2');

  const nights = differenceInDays(new Date(checkOut), new Date(checkIn));

  const [bookingForm, setBookingForm] = useState({
    guest_name: user?.name || '',
    guest_email: user?.email || '',
    guest_phone: '',
    special_requests: '',
  });

  useEffect(() => {
    fetchHotelDetails();
  }, [id]);

  useEffect(() => {
    if (user) {
      setBookingForm(prev => ({
        ...prev,
        guest_name: user.name || prev.guest_name,
        guest_email: user.email || prev.guest_email,
      }));
    }
  }, [user]);

  const fetchHotelDetails = async () => {
    try {
      const response = await searchAPI.getHotelDetails(id);
      setHotel(response.data);
      setRooms(response.data.rooms || []);
    } catch (error) {
      console.error('Error fetching hotel:', error);
      toast.error('Otel bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = (basePrice) => {
    const price = parseFloat(basePrice) || 0;
    return hasDiscount ? price * (1 - discountPercentage / 100) : price;
  };

  const handleBookRoom = (room) => {
    if (!user) {
      toast.error('Rezervasyon yapmak için giriş yapmalısınız');
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }
    setSelectedRoom(room);
    setShowBookingModal(true);
  };

  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!selectedRoom) return;

    setBookingLoading(true);
    try {
      await bookingAPI.createBooking({
        room_id: selectedRoom.id,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        ...bookingForm,
      });
      
      toast.success('Rezervasyonunuz başarıyla oluşturuldu!');
      setShowBookingModal(false);
      navigate('/bookings');
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(error.response?.data?.error || 'Rezervasyon oluşturulamadı');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-red border-t-transparent"></div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Otel bulunamadı</h2>
            <button onClick={() => navigate('/search')} className="text-brand-red hover:underline">
              Aramaya dön
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const images = hotel.images || ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        {/* Image Gallery */}
        <div className="bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-4 gap-2 h-96">
              <div className="col-span-2 row-span-2">
                <img
                  src={images[0]}
                  alt={hotel.name}
                  className="w-full h-full object-cover rounded-l-xl"
                />
              </div>
              {images.slice(1, 5).map((img, i) => (
                <div key={i} className={i === 1 ? 'rounded-tr-xl overflow-hidden' : i === 3 ? 'rounded-br-xl overflow-hidden' : ''}>
                  <img
                    src={img}
                    alt={`${hotel.name} ${i + 2}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hotel Info */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {[...Array(hotel.star_rating || 0)].map((_, i) => (
                          <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      {hasDiscount && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          %{discountPercentage} İndirim
                        </span>
                      )}
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">{hotel.name}</h1>
                    <div className="flex items-center gap-1 text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{hotel.address}, {hotel.city}, {hotel.country}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Toggle Button */}
              <button
                onClick={() => setShowMap(!showMap)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  showMap 
                    ? 'bg-brand-red text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Haritada Göster
              </button>

              {/* Map */}
              {showMap && (
                <div className="h-72 rounded-xl overflow-hidden">
                  <HotelMap 
                    hotels={[hotel]} 
                    center={[parseFloat(hotel.latitude), parseFloat(hotel.longitude)]}
                    zoom={15}
                  />
                </div>
              )}

              {/* Description */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-800 mb-3">Hakkında</h2>
                <p className="text-gray-600 leading-relaxed">{hotel.description}</p>
              </div>

              {/* Amenities */}
              {hotel.amenities && hotel.amenities.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Olanaklar</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {hotel.amenities.map((amenity, index) => (
                      <div key={index} className="flex items-center gap-2 text-gray-600">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rooms */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Odalar</h2>
                <div className="space-y-4">
                  {rooms.map((room) => {
                    const originalPrice = parseFloat(room.base_price) || 0;
                    const discountedPrice = calculatePrice(originalPrice);
                    const totalPrice = discountedPrice * nights;

                    return (
                      <div key={room.id} className="border border-gray-200 rounded-xl p-4 hover:border-brand-red transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 text-lg">{room.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded">
                                {room.room_type}
                              </span>
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded">
                                {room.capacity} Kişi
                              </span>
                              {room.size_sqm && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded">
                                  {room.size_sqm} m²
                                </span>
                              )}
                            </div>
                            {room.description && (
                              <p className="text-gray-500 text-sm mt-2">{room.description}</p>
                            )}
                          </div>

                          <div className="text-right">
                            {hasDiscount && (
                              <div className="text-gray-400 line-through text-sm">
                                ₺{originalPrice.toLocaleString('tr-TR')}/gece
                              </div>
                            )}
                            <div className={`text-2xl font-bold ${hasDiscount ? 'text-green-600' : 'text-brand-red'}`}>
                              ₺{Math.round(discountedPrice).toLocaleString('tr-TR')}
                              <span className="text-sm font-normal text-gray-500">/gece</span>
                            </div>
                            <div className="text-sm text-gray-500 mb-2">
                              {nights} gece: ₺{Math.round(totalPrice).toLocaleString('tr-TR')}
                            </div>
                            <button
                              onClick={() => handleBookRoom(room)}
                              className="px-6 py-2 bg-brand-red hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                            >
                              Rezervasyon Yap
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
                <h3 className="font-semibold text-gray-800 mb-4">Rezervasyon Detayları</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Giriş</span>
                    <span className="font-medium">
                      {format(new Date(checkIn), 'd MMMM yyyy', { locale: tr })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Çıkış</span>
                    <span className="font-medium">
                      {format(new Date(checkOut), 'd MMMM yyyy', { locale: tr })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Süre</span>
                    <span className="font-medium">{nights} gece</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Misafir</span>
                    <span className="font-medium">{guests} kişi</span>
                  </div>
                </div>

                {hasDiscount && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                      Üye İndirimi %{discountPercentage}
                    </div>
                    <p className="text-green-600 text-xs mt-1">
                      Tüm odalarda indirim uygulandı!
                    </p>
                  </div>
                )}

                {!user && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-blue-700 text-sm">
                      <a href="/login" className="font-medium hover:underline">Giriş yapın</a> ve %10 indirim kazanın!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Booking Modal */}
      {showBookingModal && selectedRoom && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">Rezervasyon Yap</h2>
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Booking Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-gray-800">{hotel.name}</h3>
                <p className="text-gray-600 text-sm">{selectedRoom.name} - {selectedRoom.room_type}</p>
                <div className="flex justify-between mt-3 pt-3 border-t border-gray-200">
                  <span className="text-gray-500">
                    {format(new Date(checkIn), 'd MMM', { locale: tr })} - {format(new Date(checkOut), 'd MMM', { locale: tr })} ({nights} gece)
                  </span>
                  <span className="font-bold text-brand-red">
                    ₺{Math.round(calculatePrice(selectedRoom.base_price) * nights).toLocaleString('tr-TR')}
                  </span>
                </div>
              </div>

              {/* Booking Form */}
              <form onSubmit={handleSubmitBooking} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ad Soyad *
                  </label>
                  <input
                    type="text"
                    value={bookingForm.guest_name}
                    onChange={(e) => setBookingForm({ ...bookingForm, guest_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-red focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-posta *
                  </label>
                  <input
                    type="email"
                    value={bookingForm.guest_email}
                    onChange={(e) => setBookingForm({ ...bookingForm, guest_email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-red focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={bookingForm.guest_phone}
                    onChange={(e) => setBookingForm({ ...bookingForm, guest_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-red focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Özel İstekler
                  </label>
                  <textarea
                    value={bookingForm.special_requests}
                    onChange={(e) => setBookingForm({ ...bookingForm, special_requests: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-red focus:border-transparent"
                    placeholder="Erken check-in, geç check-out, vb."
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full py-3 bg-brand-red hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bookingLoading ? 'Rezervasyon yapılıyor...' : 'Rezervasyonu Tamamla'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default HotelDetail;
