import React from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SearchBox from '../components/SearchBox';

const Home = () => {
  const { hasDiscount } = useAuth();

  const popularDestinations = [
    { name: 'İstanbul', image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400', hotels: 1250 },
    { name: 'Antalya', image: 'https://images.unsplash.com/photo-1593238739364-18cfde30e93a?w=400', hotels: 890 },
    { name: 'Bodrum', image: 'https://images.unsplash.com/photo-1601284570035-e6d42c8e98a8?w=400', hotels: 450 },
    { name: 'İzmir', image: 'https://images.unsplash.com/photo-1589561454226-796a8aa89b05?w=400', hotels: 320 },
    { name: 'Kapadokya', image: 'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=400', hotels: 180 },
    { name: 'Fethiye', image: 'https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?w=400', hotels: 210 },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-gray-900 to-gray-800 text-white py-20 lg:py-32">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920)' 
          }}
        />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4">
              Hayalinizdeki Oteli Bulun
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Binlerce otel arasından en uygun fiyatlarla rezervasyon yapın
            </p>
            
            {hasDiscount && (
              <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-green-500 rounded-full text-white font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
                Üye İndirimi: Tüm Otellerde %10 İndirim!
              </div>
            )}
          </div>

          {/* Search Box */}
          <SearchBox />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-brand-red/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">En İyi Fiyat Garantisi</h3>
              <p className="text-gray-600">Aynı oteli başka yerde daha ucuza bulursanız farkı iade ediyoruz.</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-brand-red/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Güvenli Ödeme</h3>
              <p className="text-gray-600">256-bit SSL şifreleme ile güvenli ödeme yapın.</p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-brand-red/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">7/24 Destek</h3>
              <p className="text-gray-600">Her an yanınızdayız. Sorularınız için bizi arayın.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Popüler Destinasyonlar</h2>
            <p className="text-gray-600">En çok tercih edilen tatil bölgelerini keşfedin</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {popularDestinations.map((dest) => (
              <a
                key={dest.name}
                href={`/search?destination=${encodeURIComponent(dest.name)}`}
                className="group relative rounded-xl overflow-hidden aspect-[4/5] shadow-lg"
              >
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h3 className="font-semibold text-lg">{dest.name}</h3>
                  <p className="text-sm text-gray-300">{dest.hotels} otel</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!hasDiscount && (
        <section className="py-16 bg-brand-red text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Üye Olun, %10 İndirim Kazanın!</h2>
            <p className="text-lg text-red-100 mb-6">
              Hemen üye olun ve tüm otellerde geçerli %10 indirimden yararlanın.
            </p>
            <a
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3 bg-white text-brand-red font-semibold rounded-xl hover:bg-gray-100 transition-colors"
            >
              Ücretsiz Üye Ol
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default Home;
