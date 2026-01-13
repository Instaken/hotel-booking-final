import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SearchBox from '../components/SearchBox';
import HotelCard from '../components/HotelCard';
import HotelMap from '../components/HotelMap';
import toast from 'react-hot-toast';

const Search = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasDiscount } = useAuth();
  
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [filters, setFilters] = useState({
    min_price: '',
    max_price: '',
    star_rating: '',
    sort_by: 'price',
    sort_order: 'asc',
  });

  const destination = searchParams.get('destination') || '';
  const checkIn = searchParams.get('check_in') || '';
  const checkOut = searchParams.get('check_out') || '';
  const guests = searchParams.get('guests') || '2';

  useEffect(() => {
    fetchHotels();
  }, [searchParams, filters]);

  const fetchHotels = async () => {
    setLoading(true);
    try {
      const params = {
        destination,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        ...filters,
        limit: 50,
      };

      // Remove empty params
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const response = await searchAPI.searchHotels(params);
      setHotels(response.data.data || []);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Oteller yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleHotelClick = (hotel) => {
    const params = new URLSearchParams({
      check_in: checkIn,
      check_out: checkOut,
      guests,
    });
    navigate(`/hotel/${hotel.id}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* Search Box */}
      <div className="bg-white shadow-sm py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SearchBox 
            compact 
            initialValues={{ 
              destination, 
              checkIn, 
              checkOut, 
              guests: parseInt(guests) 
            }} 
          />
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 mb-4">Filtreler</h3>

              {/* Price Range */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fiyat Aralığı
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.min_price}
                    onChange={(e) => setFilters({ ...filters, min_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-red focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.max_price}
                    onChange={(e) => setFilters({ ...filters, max_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-red focus:border-transparent"
                  />
                </div>
              </div>

              {/* Star Rating */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yıldız Sayısı
                </label>
                <select
                  value={filters.star_rating}
                  onChange={(e) => setFilters({ ...filters, star_rating: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-red focus:border-transparent"
                >
                  <option value="">Tümü</option>
                  <option value="5">5 Yıldız</option>
                  <option value="4">4+ Yıldız</option>
                  <option value="3">3+ Yıldız</option>
                </select>
              </div>

              {/* Sort */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sıralama
                </label>
                <select
                  value={`${filters.sort_by}_${filters.sort_order}`}
                  onChange={(e) => {
                    const [sort_by, sort_order] = e.target.value.split('_');
                    setFilters({ ...filters, sort_by, sort_order });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-red focus:border-transparent"
                >
                  <option value="price_asc">Fiyat (Düşükten Yükseğe)</option>
                  <option value="price_desc">Fiyat (Yüksekten Düşüğe)</option>
                  <option value="rating_desc">Puan (Yüksekten Düşüğe)</option>
                  <option value="name_asc">İsim (A-Z)</option>
                </select>
              </div>

              {/* Discount Info */}
              {hasDiscount && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Üye indirimi uygulandı!
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-800">
                  {destination ? `"${destination}" için oteller` : 'Tüm Oteller'}
                </h1>
                <p className="text-sm text-gray-500">
                  {hotels.length} otel bulundu
                </p>
              </div>

              {/* Map Toggle */}
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
            </div>

            {/* Map View */}
            {showMap && (
              <div className="h-96 mb-6">
                <HotelMap 
                  hotels={hotels} 
                  onHotelClick={handleHotelClick}
                />
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-red border-t-transparent"></div>
              </div>
            )}

            {/* Hotels Grid */}
            {!loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {hotels.map((hotel) => (
                  <HotelCard
                    key={hotel.id}
                    hotel={hotel}
                    onClick={() => handleHotelClick(hotel)}
                  />
                ))}
              </div>
            )}

            {/* No Results */}
            {!loading && hotels.length === 0 && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Otel bulunamadı</h3>
                <p className="text-gray-500">Farklı filtreler veya tarihler deneyin.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Search;
