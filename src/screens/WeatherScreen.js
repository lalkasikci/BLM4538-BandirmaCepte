import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native';
import {
  getBandirmaWeather,
  getBandirmaForecast,
} from '../services/weatherService';

export default function WeatherScreen({ navigation }) {
const [weather, setWeather] = useState(null);
const [forecast, setForecast] = useState([]);

const [loading, setLoading] = useState(true);
const [forecastLoading, setForecastLoading] = useState(true);

const [error, setError] = useState("");
const [forecastError, setForecastError] = useState("");

  useEffect(() => {
  async function loadCurrentWeather() {
    try {
      const currentData = await getBandirmaWeather();

      setWeather(currentData);
    } catch (err) {
      console.log("CURRENT WEATHER ERROR:", err);

      setError("Güncel hava durumu bilgisi alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  async function loadForecast() {
    try {
      const forecastData = await getBandirmaForecast();

      setForecast(forecastData);
    } catch (err) {
      console.log("FORECAST ERROR:", err);

      setForecastError("5 günlük tahmin bilgisi alınamadı.");
    } finally {
      setForecastLoading(false);
    }
  }

  loadCurrentWeather();
  loadForecast();
}, []);

  function getWeatherEmoji(main) {
    switch (main?.toLowerCase()) {
      case 'clear':
        return '☀️';
      case 'clouds':
        return '☁️';
      case 'rain':
        return '🌧️';
      case 'thunderstorm':
        return '⛈️';
      case 'snow':
        return '❄️';
      case 'mist':
      case 'fog':
      case 'haze':
        return '🌫️';
      default:
        return '🌤️';
    }
  }

  function formatDay(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5B6EF5" />
        <Text style={styles.loadingText}>Hava durumu yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const emoji = getWeatherEmoji(weather.weather?.[0]?.main);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topShape} />
      <View style={styles.bottomShape} />

      <View style={styles.headerRow}>
        <Pressable
          style={styles.homeButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.homeButtonIcon}>⌂</Text>
        </Pressable>

        <View style={styles.headerTextArea}>
          <Text style={styles.pageTitle}>Bandırma Hava Durumu</Text>
        </View>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <Text style={styles.heroEmoji}>{emoji}</Text>
          <View style={styles.heroTextArea}>
            <Text style={styles.heroLabel}>Bugün</Text>
            <Text style={styles.description}>
              {weather.weather[0].description}
            </Text>
          </View>
        </View>

        <View style={styles.heroBottom}>
          <Text style={styles.temperature}>{Math.round(weather.main.temp)}°C</Text>
          <Text style={styles.feelsLike}>
            Hissedilen {Math.round(weather.main.feels_like)}°C
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Detaylar</Text>

      <View style={styles.grid}>
        <View style={styles.infoCard}>
          <Text style={styles.cardIcon}>💧</Text>
          <Text style={styles.label}>Nem</Text>
          <Text style={styles.value}>%{weather.main.humidity}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardIcon}>🌬️</Text>
          <Text style={styles.label}>Rüzgar</Text>
          <Text style={styles.value}>{weather.wind.speed} m/s</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardIcon}>🌡️</Text>
          <Text style={styles.label}>Basınç</Text>
          <Text style={styles.value}>{weather.main.pressure} hPa</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardIcon}>👀</Text>
          <Text style={styles.label}>Durum</Text>
          <Text style={styles.valueSmall}>
            {weather.weather[0].main || 'Bilgi yok'}
          </Text>
        </View>
      </View>

<Text style={styles.sectionTitle}>5 Günlük Tahmin</Text>

{forecastLoading ? (
  <View style={styles.forecastLoadingArea}>
    <ActivityIndicator size="small" color="#5B6EF5" />

    <Text style={styles.forecastLoadingText}>
      Tahmin bilgileri yükleniyor...
    </Text>
  </View>
) : forecastError ? (
  <Text style={styles.forecastErrorText}>
    {forecastError}
  </Text>
) : (
  <View style={styles.forecastList}>
    {forecast.map((item, index) => (
      <View key={index} style={styles.forecastCard}>
        <Text style={styles.forecastDay}>
          {formatDay(item.date)}
        </Text>

        <Text style={styles.forecastEmoji}>
          {getWeatherEmoji(item.main)}
        </Text>

        <Text style={styles.forecastTemp}>
          {item.temp}°
        </Text>

        <Text style={styles.forecastRange}>
          {item.tempMin}° / {item.tempMax}°
        </Text>

        <Text
          style={styles.forecastDesc}
          numberOfLines={2}
        >
          {item.description}
        </Text>
      </View>
    ))}
  </View>
)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FC',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    fontSize: 16,
    color: '#D64545',
    fontWeight: '600',
  },
forecastLoadingArea: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#FFFFFF",
  borderRadius: 14,
  padding: 14,
},

forecastLoadingText: {
  color: "#64748B",
  fontSize: 14,
  marginLeft: 10,
},

forecastErrorText: {
  color: "#B91C1C",
  fontSize: 14,
  backgroundColor: "#FEF2F2",
  borderRadius: 14,
  padding: 14,
},
  topShape: {
    position: 'absolute',
    top: -50,
    right: -70,
    width: 220,
    height: 180,
    backgroundColor: '#DCE3FF',
    borderRadius: 120,
    opacity: 0.8,
  },
  bottomShape: {
    position: 'absolute',
    left: -60,
    bottom: 30,
    width: 170,
    height: 170,
    backgroundColor: '#EEF2FF',
    borderRadius: 90,
    opacity: 0.9,
  },

  headerRow: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  homeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B1F2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  homeButtonIcon: {
    fontSize: 20,
    color: '#182033',
    fontWeight: '800',
  },
  headerTextArea: {
    alignItems: 'center',
  },
  city: {
    fontSize: 30,
    fontWeight: '800',
    color: '#182033',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#182033',
    marginTop: 8,
  },

  heroCard: {
    backgroundColor: '#5B6EF5',
    borderRadius: 28,
    padding: 22,
    marginBottom: 24,
    shadowColor: '#24307A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 26,
  },
  heroEmoji: {
    fontSize: 42,
    marginRight: 14,
  },
  heroTextArea: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DDE4FF',
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  description: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  heroBottom: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingTop: 18,
  },
  temperature: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 62,
  },
  feelsLike: {
    marginTop: 6,
    fontSize: 15,
    color: '#E6EBFF',
    fontWeight: '500',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#182033',
    marginBottom: 14,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  infoCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#1B1F2A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  cardIcon: {
    fontSize: 22,
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    color: '#7A8597',
    marginBottom: 8,
    fontWeight: '600',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: '#182033',
  },
  valueSmall: {
    fontSize: 18,
    fontWeight: '800',
    color: '#182033',
  },

  forecastList: {
    gap: 12,
  },
  forecastCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#1B1F2A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  forecastDay: {
    width: 72,
    fontSize: 13,
    fontWeight: '700',
    color: '#182033',
  },
  forecastEmoji: {
    fontSize: 24,
    width: 40,
    textAlign: 'center',
  },
  forecastTemp: {
    width: 52,
    fontSize: 22,
    fontWeight: '900',
    color: '#182033',
    textAlign: 'center',
  },
  forecastRange: {
    width: 72,
    fontSize: 12,
    color: '#7A8597',
    textAlign: 'center',
  },
  forecastDesc: {
    flex: 1,
    fontSize: 13,
    color: '#5F6B7A',
    textTransform: 'capitalize',
    textAlign: 'right',
    marginLeft: 8,
  },
});