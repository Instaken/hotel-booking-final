import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const HotelMap = ({ hotels = [], center, zoom = 12, onHotelClick }) => {
  const defaultCenter = center || [41.0082, 28.9784]; // Istanbul default

  // Calculate center from hotels if not provided
  const mapCenter = center || (hotels.length > 0 
    ? [
        hotels.reduce((sum, h) => sum + parseFloat(h.latitude || 0), 0) / hotels.length,
        hotels.reduce((sum, h) => sum + parseFloat(h.longitude || 0), 0) / hotels.length,
      ]
    : defaultCenter
  );

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-lg">
      <MapContainer 
        center={mapCenter} 
        zoom={zoom} 
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {hotels.map((hotel) => {
          if (!hotel.latitude || !hotel.longitude) return null;
          
          return (
            <Marker 
              key={hotel.id}
              position={[parseFloat(hotel.latitude), parseFloat(hotel.longitude)]}
              eventHandlers={{
                click: () => onHotelClick && onHotelClick(hotel),
              }}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h3 className="font-semibold text-gray-800 mb-1">{hotel.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>{hotel.star_rating} yıldız</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{hotel.city}</p>
                  {hotel.min_price && (
                    <p className="text-lg font-bold text-brand-red">
                      ₺{parseFloat(hotel.min_price).toLocaleString('tr-TR')}/gece
                    </p>
                  )}
                  <button 
                    onClick={() => onHotelClick && onHotelClick(hotel)}
                    className="mt-2 w-full px-3 py-1.5 bg-brand-red text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Detayları Gör
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default HotelMap;
