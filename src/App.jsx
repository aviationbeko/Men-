import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './supabaseClient';
import { menuCategories as fallbackMenu } from './data';
import { 
  Search, 
  Sparkles, 
  Coffee,
  UtensilsCrossed,
  Loader,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

// Framer Motion Animasyon Değişkenleri
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  show: { 
    y: 0, 
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  }
};

function App() {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedItems, setExpandedItems] = useState({});
  const [showSplash, setShowSplash] = useState(true);

  // Tema renkleri (1. Renk Cam Göbeği, 2. Renk Mavi)
  const [themeColor1, setThemeColor1] = useState('#06b6d4');
  const [themeColor2, setThemeColor2] = useState('#2563eb');
  const [autoCycle, setAutoCycle] = useState(false);
  const cycleRef = useRef(null);

  const tabsRef = useRef(null);

  // Hoş geldiniz (Splash) ekranı zamanlayıcısı (3.5 saniye)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  // PC kullanıcıları için kategoriler yatay kaydırma desteği (Mouse Wheel & Click-Drag)
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const scrollLeftState = useRef(0);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const handleMouseDown = (e) => {
    const el = tabsRef.current;
    if (!el) return;
    setIsDragging(true);
    hasMoved.current = false;
    dragStartPos.current = { x: e.pageX, y: e.pageY };
    startX.current = e.pageX - el.offsetLeft;
    scrollLeftState.current = el.scrollLeft;
    el.style.scrollBehavior = 'auto'; // Drag sırasında smooth scroll'u kapat
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const el = tabsRef.current;
    if (!el) return;
    
    const dx = Math.abs(e.pageX - dragStartPos.current.x);
    const dy = Math.abs(e.pageY - dragStartPos.current.y);
    if (dx > 5 || dy > 5) {
      hasMoved.current = true;
    }
    
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX.current) * 1.5; // Kaydırma çarpanı
    el.scrollLeft = scrollLeftState.current - walk;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
    const el = tabsRef.current;
    if (el) {
      el.style.scrollBehavior = 'smooth'; // Smooth scroll'u geri aç
    }
  };

  // Supabase'den Menü Verilerini Yükle
  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true);
        if (supabase) {
          const { data, error } = await supabase
            .from('kafana_gore_menu')
            .select('data')
            .eq('id', 'main')
            .single();

          if (error) throw error;
          if (data && data.data) {
            setMenu(data.data);
          } else {
            setMenu(fallbackMenu);
          }

          // Tema Ayarlarını da yükle
          const { data: settings } = await supabase
            .from('kafana_gore_settings')
            .select('*')
            .eq('id', 'main')
            .single();

          if (settings) {
            // Renkler kodda cam gobeği ve mavi olarak sabitlenmiştir
            if (settings.auto_cycle !== undefined) setAutoCycle(settings.auto_cycle);
          }
        } else {
          setMenu(fallbackMenu);
        }
      } catch (err) {
        console.error('Menü yüklenirken hata oluştu:', err);
        setMenu(fallbackMenu);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, []);

  // Realtime: Menü değişince otomatik güncelle
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('menu-realtime')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'kafana_gore_menu',
        filter: 'id=eq.main'
      }, (payload) => {
        if (payload.new?.data) {
          setMenu(payload.new.data);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'kafana_gore_settings',
        filter: 'id=eq.main'
      }, (payload) => {
        if (payload.new) {
          // Renkler kodda sabit, sadece auto_cycle realtime senkronize edilir
          if (payload.new.auto_cycle !== undefined) setAutoCycle(payload.new.auto_cycle);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // CSS değişkenlerini tema renklerine göre güncelle
  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', themeColor1);
    document.documentElement.style.setProperty('--color-accent', themeColor2);
    
    // Varsayılan arayüz değişkenleri
    document.documentElement.style.setProperty('--font-family', "'Outfit', sans-serif");
    document.documentElement.style.setProperty('--radius', '12px');
    document.documentElement.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.75)');
    document.documentElement.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.6)');
    document.documentElement.style.setProperty('--text-main', '#1e293b');
    document.documentElement.style.setProperty('--text-muted', '#475569');
  }, [themeColor1, themeColor2]);

  // Otomatik renk döngüsü
  useEffect(() => {
    if (cycleRef.current) clearInterval(cycleRef.current);
    if (!autoCycle) return;
    let swapped = false;
    cycleRef.current = setInterval(() => {
      swapped = !swapped;
      if (swapped) {
        document.documentElement.style.setProperty('--color-primary', themeColor2);
        document.documentElement.style.setProperty('--color-accent', themeColor1);
      } else {
        document.documentElement.style.setProperty('--color-primary', themeColor1);
        document.documentElement.style.setProperty('--color-accent', themeColor2);
      }
    }, 4000);
    return () => clearInterval(cycleRef.current);
  }, [autoCycle, themeColor1, themeColor2]);

  // PC kullanıcıları için Mouse Wheel kaydırma
  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      if (e.deltaY === 0) return;
      el.scrollLeft += e.deltaY * 0.8;
      e.preventDefault();
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      if (el) el.removeEventListener('wheel', handleWheel);
    };
  }, [loading, menu]);

  // Butonla kaydırma işlevi (Sol / Sağ Ok tuşları)
  const scrollTabs = (direction) => {
    const el = tabsRef.current;
    if (!el) return;
    const scrollAmount = 200;
    if (direction === 'left') {
      el.scrollLeft -= scrollAmount;
    } else {
      el.scrollLeft += scrollAmount;
    }
  };

  // Ekstra listesini aç/kapat
  const toggleExpand = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // Kategorileri çıkar (Sadece aktif ürünü olan kategorileri gösterelim)
  const categories = useMemo(() => {
    const list = menu
      .filter(cat => cat.items && cat.items.some(item => item.active))
      .map(cat => cat.category);
    return ['all', ...list];
  }, [menu]);

  // Arama ve kategori filtreleme
  const filteredMenu = useMemo(() => {
    return menu.map(cat => {
      // Kategori filtresi
      if (activeCategory !== 'all' && cat.category !== activeCategory) {
        return null;
      }

      // Aktif olan ürünleri filtrele
      const activeItems = (cat.items || []).filter(item => {
        if (!item.active) return false;
        
        // Arama filtresi
        if (searchQuery.trim() === '') return true;
        
        const q = searchQuery.toLowerCase();
        const nameMatch = item.name?.toLowerCase().includes(q);
        const descMatch = item.description?.toLowerCase().includes(q);
        return nameMatch || descMatch;
      });

      if (activeItems.length === 0) return null;

      return {
        ...cat,
        items: activeItems
      };
    }).filter(Boolean);
  }, [menu, activeCategory, searchQuery]);

  return (
    <div id="root">
      
      {/* Hoş Geldiniz Ekranı (Splash Screen - 3.5 Saniye Otomatik Geçiş) */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8 }}
            className="splash-overlay"
          >
            <div className="splash-card" style={{ boxShadow: 'none', background: 'transparent', border: 'none' }}>
              <div className="splash-logo-wrapper">
                <div className="splash-logo-pulse"></div>
                <Coffee size={72} color="#ea580c" style={{ position: 'relative', zIndex: 3 }} />
              </div>
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="welcome-title-simple"
              >
                Hoş Geldiniz
              </motion.h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Yükleniyor Ekranı */}
      <AnimatePresence>
        {loading && !showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="loading-overlay"
          >
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
              <Loader size={48} color="#ea580c" />
            </motion.div>
            <p className="loading-text">Menü yükleniyor...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Şık Başlık Paneli (Kafa Header ile aynı) */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="header-container glass-panel"
      >
        <h1><Coffee size={44} color="#ea580c" /> Kafana Göre Kahvaltı</h1>
        <p className="header-tagline">Masaüstü QR Dijital Menü</p>

        {/* Arama Barı (POS ile uyumlu stilize edilmiş) */}
        <div className="search-bar-wrapper">
          <span className="search-icon-wrapper">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Menüde lezzet ara... (Tost, Patso, Çay vb.)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input-field"
          />
        </div>

        {/* Kategori Sekmeleri (Scroll butonlu ve sürükleme destekli) */}
        <div className="nav-tabs-wrapper">
          <button 
            className="nav-arrow nav-arrow-left" 
            onClick={() => scrollTabs('left')}
            aria-label="Sola Kaydır"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div 
            className="nav-tabs" 
            ref={tabsRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            {categories.map((cat) => (
              <motion.button
                key={cat}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`nav-tab ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => {
                  if (!hasMoved.current) {
                    setActiveCategory(cat);
                  }
                }}
              >
                {cat === 'all' ? 'Tümü' : cat}
              </motion.button>
            ))}
          </div>

          <button 
            className="nav-arrow nav-arrow-right" 
            onClick={() => scrollTabs('right')}
            aria-label="Sağa Kaydır"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </motion.div>

      {/* Ana Arayüz */}
      <main className="main-content">
        {filteredMenu.length === 0 ? (
          <div className="empty-state">
            <UtensilsCrossed size={64} opacity={0.3} />
            <p>Aradığınız lezzet bulunamadı.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {filteredMenu.map((cat, catIdx) => (
              <motion.section
                key={cat.category}
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="category-section"
              >
                {/* Kategori Başlığı (POS'taki gibi şık çizgi ile) */}
                <div className="category-section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                  <span className="category-indicator" style={{ width: '4px', height: '18px', background: 'linear-gradient(135deg, #f59e0b, #ea580c)', borderRadius: '2px' }}></span>
                  <h3 className="category-title" style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', border: 'none', margin: 0, padding: 0 }}>
                    {cat.category}
                  </h3>
                  <span className="category-count" style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>
                    ({cat.items.length} Ürün)
                  </span>
                </div>

                <div className="digital-menu-grid">
                  {cat.items.map((item) => (
                    <motion.div
                      key={item.id}
                      variants={itemVariants}
                      className="digital-menu-card"
                    >
                      {/* Rozetler */}
                      <div className="menu-card-badges">
                        {item.chefRecommend && <span className="badge-custom badge-chef">⭐ Şefin Tavsiyesi</span>}
                        {item.vegan && <span className="badge-custom badge-vegan">🌱 Vegan</span>}
                        {item.spicy && <span className="badge-custom badge-spicy">🌶️ Acı</span>}
                        {item.hasAllergen && <span className="badge-custom badge-allergen">⚠️ Alerjen</span>}
                      </div>

                      {/* Ürün Görseli */}
                      {item.image && (
                        <div className="menu-card-image-wrapper">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="menu-card-image" 
                            loading="lazy" 
                          />
                        </div>
                      )}

                      {/* Ürün Gövdesi */}
                      <div className="menu-card-body">
                        <div className="menu-card-header">
                          <h4 className="menu-card-title">{item.name}</h4>
                          <span className="menu-card-price">{item.price.toFixed(2)} TL</span>
                        </div>

                        {/* Açıklama / İçindekiler */}
                        {item.description && (
                          <p className="menu-card-description">
                            {item.description}
                          </p>
                        )}

                        {/* Ekstra Malzemeler ve Göster/Gizle Butonu */}
                        {item.extras && item.extras.length > 0 && (
                          <div className="menu-card-extras-section">
                            <button
                              onClick={() => toggleExpand(item.id)}
                              className="extras-toggle-btn"
                            >
                              <span>Ekstra Malzemeler</span>
                              {expandedItems[item.id] ? (
                                <ChevronUp size={12} />
                              ) : (
                                <ChevronDown size={12} />
                              )}
                            </button>

                            <AnimatePresence>
                              {expandedItems[item.id] && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  style={{ overflow: 'hidden' }}
                                >
                                  <div className="menu-card-extras-list" style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                    {item.extras.map((extra, eIdx) => (
                                      <span key={eIdx} className="menu-card-extra-pill">
                                        {extra.name} (+{extra.price} TL)
                                      </span>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            ))}
          </div>
        )}
      </main>

      {/* Şık Instagram Alt Alanı */}
      <footer className="menu-footer">
        <div className="footer-content">
          <p className="footer-title">BİZİ SOSYAL MEDYADA TAKİP EDİN</p>
          <a
            href="https://www.instagram.com/kafanagorekahvalti/"
            target="_blank"
            rel="noopener noreferrer"
            className="instagram-btn"
          >
            <svg className="instagram-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
            <span>@kafanagorekahvalti</span>
          </a>
          <p className="footer-copy">
            © {new Date().getFullYear()} Kafana Göre Kahvaltı. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
