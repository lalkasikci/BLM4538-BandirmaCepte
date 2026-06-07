import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { getBandirmaWeather } from '../services/weatherService';
import { getEarthquakes } from '../services/earthquakeService';
import { getBandirmaNews } from '../services/newsService';
import { logoutUser } from '../services/authService';
const { width: SW } = Dimensions.get('window');
const H_PAD = 16;
const INNER = SW - H_PAD * 2;
function withTimeout(promise, timeoutMs = 10000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('İstek zaman aşımına uğradı.'));
      }, timeoutMs);
    }),
  ]);
}

/* ─── Animasyon yardımcıları ─────────────────────────── */

function FadeSlide({ delay = 0, children, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 500, delay, useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View style={[style, {
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
    }]}>
      {children}
    </Animated.View>
  );
}

function ScalePressable({ onPress, style, children }) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }).start()}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

function PulseBox({ style }) {
  const p = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(p, { toValue: 1,   duration: 750, useNativeDriver: true }),
      Animated.timing(p, { toValue: 0.4, duration: 750, useNativeDriver: true }),
    ])).start();
  }, []);
  return <Animated.View style={[style, { opacity: p }]} />;
}

/* ─── Ana Ekran ──────────────────────────────────────── */

export default function HomeScreen({ navigation }) {
  const [weather,     setWeather]     = useState(null);
  const [earthquakes, setEarthquakes] = useState([]);
  const [news,        setNews]        = useState([]);
  const [loading,     setLoading]     = useState(true);

  
  const dotScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(dotScale, { toValue: 1.8, duration: 900, useNativeDriver: true }),
      Animated.timing(dotScale, { toValue: 1,   duration: 900, useNativeDriver: true }),
    ])).start();
  }, []);


  useEffect(() => {
  let finishedRequestCount = 0;

  function finishOneRequest() {
    finishedRequestCount += 1;

    if (finishedRequestCount === 3) {
      setLoading(false);
    }
  }

  withTimeout(getBandirmaWeather(), 5000)
    .then((weatherData) => {
      setWeather(weatherData);

      // Hava durumu geldiyse ana kartı hemen göster.
      setLoading(false);
    })
    .catch((error) => {
      console.log("HOME WEATHER ERROR:", error);
    })
    .finally(finishOneRequest);

  withTimeout(getEarthquakes(), 5000)
    .then((earthquakeData) => {
      setEarthquakes(earthquakeData.items || []);
    })
    .catch((error) => {
      console.log("HOME EARTHQUAKE ERROR:", error);
    })
    .finally(finishOneRequest);

  withTimeout(getBandirmaNews(), 5000)
    .then((newsData) => {
      setNews(newsData || []);
    })
    .catch((error) => {
      console.log("HOME NEWS ERROR:", error);
    })
    .finally(finishOneRequest);
}, []);

  function cut(t, max) {
    if (!t) return '';
    return t.length <= max ? t : t.slice(0, max) + '…';
  }
  async function handleLogout() {
  await logoutUser();

  navigation.reset({
    index: 0,
    routes: [{ name: 'Login' }],
  });
}

  const temp     = weather ? `${Math.round(weather.main.temp)}°C` : '--';
  const desc     = weather ? (weather.weather?.[0]?.description || '') : '';
  const humidity = weather ? `Nem: %${weather.main.humidity}` : '';
  const topEqs   = earthquakes.slice(0, 4);
  const topNews  = news.slice(0, 3);

  /* haber kartı genişliği: 3 kart + boşluklar tam ekranı doldursun */
  const NEWS_W = (INNER - 20) / 2.5; // yatay kaydırmalı, geniş kartlar

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ══════════════ HAVA DURUMU ══════════════ */}
      <FadeSlide delay={0}>
        <ScalePressable style={styles.weatherCard} onPress={() => navigation.navigate('Weather')}>
          {/* dekoratif daireler */}
          <View style={styles.wBlob1} />
          <View style={styles.wBlob2} />

          <View style={styles.weatherHeader}>
  <View style={styles.logoCircle}>
    <Image
      source={require('../../assets/icon.png')}
      style={styles.logoImg}
      resizeMode="cover"
    />
  </View>

  <View style={styles.weatherHeaderTitle}>
    <Text style={styles.cityLabel}>BANDIRMA</Text>
    <Text style={styles.appLabel}>CEPTE</Text>
  </View>

  <Pressable
  style={styles.logoutIconButton}
  onPress={(event) => {
    event.stopPropagation?.();
    handleLogout();
  }}
  accessibilityLabel="Çıkış yap"
>
  <Text style={styles.logoutIcon}>⏻</Text>
</Pressable>
</View>

          <View style={styles.weatherBody}>
            <View>
              <Text style={styles.tempText}>{loading ? '--°C' : temp}</Text>
              <Text style={styles.descText}>{loading ? 'Yükleniyor...' : cut(desc, 22)}</Text>
              <Text style={styles.humidText}>{loading ? '' : humidity}</Text>
            </View>
            <Text style={styles.weatherEmoji}>⛅</Text>
          </View>
        </ScalePressable>
      </FadeSlide>

      
      <FadeSlide delay={100}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Animated.View style={[styles.liveDot, { transform: [{ scale: dotScale }] }]} />
            <Text style={styles.sectionTitle}>SON DAKİKA HABERLERİ</Text>
            <Pressable onPress={() => navigation.navigate('News')}>
              <Text style={styles.seeAll}>Tümü →</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.newsScrollInner}
          >
            {loading
              ? [0, 1, 2].map(i => (
                  <View key={i} style={[styles.newsCard, { width: NEWS_W }]}>
                    <PulseBox style={styles.newsImgSkel} />
                    <View style={styles.newsCardBody}>
                      <PulseBox style={{ height: 12, borderRadius: 4, backgroundColor: '#E2E8F0', marginBottom: 6 }} />
                      <PulseBox style={{ height: 12, width: '70%', borderRadius: 4, backgroundColor: '#E2E8F0' }} />
                    </View>
                  </View>
                ))
                
              : topNews.map((item, i) => (
                  <ScalePressable
                    key={i}
                    style={[styles.newsCard, { width: NEWS_W }]}
                    onPress={() => navigation.navigate('News')}
                  >
                    {item.image
                      ? <Image source={{ uri: item.image }} style={styles.newsImg} resizeMode="cover" />
                      : (
                        <View style={[styles.newsImg, styles.newsImgFallback]}>
                          <Text style={{ fontSize: 32 }}>📰</Text>
                        </View>
                      )
                    }
                    <View style={styles.newsCardBody}>
                      <Text style={styles.newsCardTitle} numberOfLines={3}>{cut(item.title, 70)}</Text>
                      {!!item.timeAgo && <Text style={styles.newsCardTime}>{item.timeAgo}</Text>}
                    </View>
                  </ScalePressable>
                ))
            }
          </ScrollView>
        </View>
      </FadeSlide>

      {/* ══════════════ SON DEPREMLER ══════════════ */}
      <FadeSlide delay={200}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>SON DEPREMLER</Text>
            <Pressable onPress={() => navigation.navigate('Earthquake')}>
              <Text style={styles.seeAll}>Tümü →</Text>
            </Pressable>
          </View>

          <View style={styles.eqList}>
            {loading
              ? [0, 1, 2].map(i => (
                  <View key={i} style={styles.eqRow}>
                    <PulseBox style={{ width: 64, height: 40, borderRadius: 10, backgroundColor: '#E2E8F0' }} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <PulseBox style={{ height: 13, borderRadius: 4, backgroundColor: '#E2E8F0' }} />
                      <PulseBox style={{ height: 11, width: '40%', borderRadius: 4, backgroundColor: '#EEF1F8' }} />
                    </View>
                  </View>
                ))
              : topEqs.length === 0
                ? <Text style={styles.noData}>Deprem verisi alınamadı.</Text>
                : topEqs.map((eq, i) => {
                    const mag    = eq.mag ?? '--';
                    const magNum = parseFloat(mag);
                    const COLOR  = magNum >= 5 ? '#E53E3E' : magNum >= 4 ? '#DD6B20' : magNum >= 3 ? '#D69E2E' : '#38A169';
                    const isLast = i === topEqs.length - 1;
                    return (
                      <ScalePressable
                        key={i}
                        style={[styles.eqRow, isLast && { borderBottomWidth: 0 }]}
                        onPress={() => navigation.navigate('Earthquake')}
                      >
                        <View style={[styles.magBubble, { backgroundColor: COLOR + '20', borderColor: COLOR + '50' }]}>
                          <Text style={[styles.magTxt, { color: COLOR }]}>M {mag}</Text>
                        </View>
                        <View style={styles.eqInfo}>
                          <Text style={styles.eqTitle} numberOfLines={1}>{cut(eq.title || 'Bilinmeyen', 42)}</Text>
                          <Text style={styles.eqSub}>
                            {eq.distanceKm != null ? `${eq.distanceKm.toFixed(0)} km` : ''}
                            {eq.distanceKm != null && eq.timeAgo ? '  ·  ' : ''}
                            {eq.timeAgo || ''}
                          </Text>
                        </View>
                        <Text style={styles.eqArrow}>›</Text>
                      </ScalePressable>
                    );
                  })
            }
          </View>
        </View>
      </FadeSlide>

      {/* ══════════════ MODÜLLER ══════════════ */}
      <FadeSlide delay={300}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MODÜLLER</Text>
          </View>

          {/* 5 modül: 2 + 3 satır ya da tek satır kaydırmalı */}
          <View style={styles.modGrid}>
            {[
              
              { route: 'Emergency', name: 'Acil\nNumaralar', bg: '#ffd6d6', iconBg: '#fca4a4', emoji: '🚨' },
              { route: 'Events', bg: '#EDE9FE', iconBg: '#DDD6FE', emoji: '🎭', name: 'Etkinlikler' },
              { route: 'Pharmacy',   bg: '#FFEAF8', iconBg: '#FFCFEF', emoji: '💊', name: 'Eczaneler' },
              { route: 'Bus',        bg: '#E8F4FF', iconBg: '#CBE7FF', emoji: '🚌', name: 'Otobüs\nSaatleri' },
            ].map((item) => (
              <ScalePressable
                key={item.route}
                style={[styles.modItem, { backgroundColor: item.bg }]}
                onPress={() => navigation.navigate(item.route)}
              >
                <View style={[styles.modIconWrap, { backgroundColor: item.iconBg }]}>
                  <Text style={styles.modEmoji}>{item.emoji}</Text>
                </View>
                <Text style={styles.modLabel}>{item.name}</Text>
              </ScalePressable>
            ))}
          </View>
        </View>
      </FadeSlide>

    </ScrollView>
  );
}

/* ─── Stiller ─────────────────────────────────────────── */

const SLATE  = '#0D1424';
const MUTED  = '#8898B0';
const INDIGO = '#5361FF';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4FB' },
  content:   { paddingBottom: 48, gap: 0 },

  /* ── Hava Durumu ── */
  weatherCard: {
    backgroundColor: '#5361FF',
    marginHorizontal: H_PAD,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 28,
    padding: 22,
    overflow: 'hidden',
    shadowColor: '#5361FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  wBlob1: {
    position: 'absolute', top: -60, right: -40,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#fff', opacity: 0.08,
  },
  wBlob2: {
    position: 'absolute', bottom: -50, left: -30,
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: '#fff', opacity: 0.05,
  },
  weatherHeader: {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  marginBottom: 18,
  paddingBottom: 16,
  borderBottomWidth: 0.5,
  borderBottomColor: "rgba(255,255,255,0.2)",
},

weatherHeaderTitle: {
  flex: 1,
},

logoutIconButton: {
  width: 38,
  height: 38,
  borderRadius: 19,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.18)",
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.24)",
},

logoutIcon: {
  color: "#FFFFFF",
  fontSize: 19,
  fontWeight: "900",
},
  logoCircle: {
    width: 46, height: 46, borderRadius: 23,
    overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.15)',
  },
  logoImg:  { width: 46, height: 46 },
  cityLabel:{ fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  appLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 },
  weatherBody: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  tempText:  { fontSize: 52, fontWeight: '900', color: '#fff', letterSpacing: -2, lineHeight: 56 },
  descText:  { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginTop: 4, textTransform: 'capitalize' },
  humidText: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 3, fontWeight: '500' },
  weatherEmoji: { fontSize: 72, lineHeight: 80 },

  /* ── Bölüm ── */
  section: { marginHorizontal: H_PAD, marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  liveDot: {
    width: 9, height: 9, borderRadius: 5, backgroundColor: '#E53E3E',
  },
  sectionTitle: {
    fontSize: 12, fontWeight: '800', color: SLATE, letterSpacing: 1.5, flex: 1,
  },
  seeAll: { fontSize: 12, fontWeight: '700', color: INDIGO },

  
  newsScrollInner: { gap: 12, paddingRight: 4 },
  newsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  newsImg: { width: '100%', height: 110, backgroundColor: '#EEF1F8' },
  newsImgSkel: { width: '100%', height: 110, backgroundColor: '#E2E8F0' },
  newsImgFallback: { alignItems: 'center', justifyContent: 'center' },
  newsCardBody: { padding: 12 },
  newsCardTitle: { fontSize: 13, fontWeight: '700', color: SLATE, lineHeight: 19, marginBottom: 6 },
  newsCardTime:  { fontSize: 11, color: MUTED, fontWeight: '500' },

 
  eqList: {
    backgroundColor: '#fff',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  eqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F2FA',
  },
  magBubble: {
    minWidth: 68,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  magTxt: { fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },
  eqInfo: { flex: 1 },
  eqTitle: { fontSize: 14, fontWeight: '700', color: SLATE, marginBottom: 3 },
  eqSub:   { fontSize: 12, color: MUTED, fontWeight: '500' },
  eqArrow: { fontSize: 20, color: '#C8CEDF', fontWeight: '600' },
  noData:  { padding: 20, fontSize: 13, color: MUTED, textAlign: 'center' },

  /* ── Modüller ── */
  
modItem: {
  borderRadius: 20,
  paddingVertical: 18,
  paddingHorizontal: 12,
  alignItems: 'center',
  gap: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 6,
  elevation: 2,
},
  modIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  modEmoji: { fontSize: 26, lineHeight: 32 },
  modLabel: {
    fontSize: 12, fontWeight: '700', color: SLATE,
    textAlign: 'center', lineHeight: 17,
  },
});