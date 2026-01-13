import React from 'react';
import { useAuth } from '../context/AuthContext';

const HotelCard = ({ hotel, onClick }) => {
  const { hasDiscount, discountPercentage } = useAuth();

  const originalPrice = parseFloat(hotel.min_price) || 0;
  const discountedPrice = hasDiscount 
    ? originalPrice * (1 - discountPercentage / 100) 
    : originalPrice;

  const images = hotel.images || [];
  const mainImage = images[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800';

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden group"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={mainImage}
          alt={hotel.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Discount Badge */}
        {hasDiscount && originalPrice > 0 && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
            %{discountPercentage} İNDİRİM
          </div>
        )}

        {/* Star Rating */}
        <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 text-white text-xs font-medium rounded-full flex items-center gap-1">
          <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span>{hotel.star_rating}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 text-lg mb-1 line-clamp-1">
          {hotel.name}
        </h3>
        
        <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{hotel.city}, {hotel.country}</span>
        </div>

        {/* Amenities */}
        {hotel.amenities && hotel.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {hotel.amenities.slice(0, 3).map((amenity, index) => (
              <span 
                key={index}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {amenity}
              </span>
            ))}
            {hotel.amenities.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{hotel.amenities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-end justify-between pt-3 border-t border-gray-100">
          <div>
            {hasDiscount && originalPrice > 0 && (
              <span className="text-gray-400 line-through text-sm">
                ₺{originalPrice.toLocaleString('tr-TR')}
              </span>
            )}
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-bold ${hasDiscount ? 'text-green-600' : 'text-brand-red'}`}>
                ₺{Math.round(discountedPrice).toLocaleString('tr-TR')}
              </span>
              <span className="text-gray-500 text-sm">/gece</span>
            </div>
          </div>

          <button className="px-4 py-2 bg-brand-red hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
            İncele
          </button>
        </div>
      </div>
    </div>
  );
};

export default HotelCard;
