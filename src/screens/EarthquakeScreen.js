import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getEarthquakes } from "../services/earthquakeService";

export default function EarthquakeScreen({ navigation }) {
  const [earthquakes, setEarthquakes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");
  const [warning, setWarning] = useState("");
  const [isLive, setIsLive] = useState(true);
  const [source, setSource] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    loadEarthquakes();
  }, []);

  async function loadEarthquakes() {
    try {
      setLoading(true);
      setErrorMessage("");

      const result = await getEarthquakes();

      setEarthquakes(result.items || []);
      setWarning(result.warning || "");
      setIsLive(result.isLive !== false);
      setSource(result.source || "AFAD");
      setUpdatedAt(result.updatedAt || "");
    } catch (error) {
      console.log("DEPREM EKRANI HATASI:", error.message);

      setEarthquakes([]);
      setWarning("");
      setIsLive(false);

      setErrorMessage(
        error.message ||
          "Deprem verilerine şu anda ulaşılamıyor."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString) {
    if (!dateString) {
      return "Tarih bilgisi bulunamadı";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDistance(distanceKm) {
    if (!Number.isFinite(distanceKm)) {
      return "Uzaklık bilgisi bulunamadı";
    }

    return `${Math.round(distanceKm)} km uzaklıkta`;
  }

  function formatMagnitude(magnitude) {
    const numericMagnitude = Number(magnitude);

    if (!Number.isFinite(numericMagnitude)) {
      return "-";
    }

    return numericMagnitude.toFixed(1);
  }

  function getMagnitudeStyle(magnitude) {
    const numericMagnitude = Number(magnitude);

    if (!Number.isFinite(numericMagnitude)) {
      return styles.magnitudeLow;
    }

    if (numericMagnitude >= 4) {
      return styles.magnitudeHigh;
    }

    if (numericMagnitude >= 3) {
      return styles.magnitudeMedium;
    }

    return styles.magnitudeLow;
  }

  function renderEarthquakeCard({ item }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardTopRow}>
          <View style={styles.cardTitleArea}>
            <Text style={styles.location} numberOfLines={2}>
              {item.title}
            </Text>

            <Text style={styles.distance}>
              {formatDistance(item.distanceKm)}
            </Text>
          </View>

          <View
            style={[
              styles.magnitudeBadge,
              getMagnitudeStyle(item.mag),
            ]}
          >
            <Text style={styles.magnitudeText}>
              {formatMagnitude(item.mag)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🕒</Text>

          <Text style={styles.infoText}>
            {formatDate(item.date)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📏</Text>

          <Text style={styles.infoText}>
            Derinlik:{" "}
            {item.depth != null
              ? `${item.depth} km`
              : "Bilgi bulunamadı"}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📡</Text>

          <Text style={styles.infoText}>
            Kaynak: {item.provider || source || "AFAD"}
          </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5361FF" />

        <Text style={styles.loadingText}>
          Deprem verileri yükleniyor...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.homeButton}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={styles.homeButtonIcon}>⌂</Text>
      </Pressable>

      <View style={styles.headerArea}>
        <Text style={styles.pageTitle}>
          Yakındaki Depremler
        </Text>

        <Text style={styles.pageSubtitle}>
          Bandırma ve çevresindeki son deprem kayıtları
        </Text>
      </View>

      {source ? (
        <View style={styles.sourceRow}>
          <View
            style={[
              styles.statusDot,
              isLive
                ? styles.statusDotLive
                : styles.statusDotCache,
            ]}
          />

          <Text style={styles.sourceText}>
            {isLive
              ? `Canlı veri kaynağı: ${source}`
              : `Son başarılı kayıtlar: ${source}`}
          </Text>
        </View>
      ) : null}

      {updatedAt ? (
        <Text style={styles.updatedText}>
          Son güncelleme: {formatDate(updatedAt)}
        </Text>
      ) : null}

      {warning ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>
            Bilgilendirme
          </Text>

          <Text style={styles.warningText}>
            {warning}
          </Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>
            Bağlantı kurulamadı
          </Text>

          <Text style={styles.errorText}>
            {errorMessage}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={loadEarthquakes}
          >
            <Text style={styles.retryButtonText}>
              Tekrar Dene
            </Text>
          </Pressable>
        </View>
      ) : null}

      {!errorMessage && earthquakes.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>
            Gösterilecek kayıt bulunamadı
          </Text>

          <Text style={styles.emptyText}>
            {isLive
              ? "Bandırma ve çevresinde son 7 gün içinde gösterilecek deprem kaydı bulunamadı."
              : "AFAD canlı verisine ulaşılamadığı için yakın deprem durumu doğrulanamıyor."}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={loadEarthquakes}
          >
            <Text style={styles.retryButtonText}>
              Yenile
            </Text>
          </Pressable>
        </View>
      ) : null}

      {!errorMessage && earthquakes.length > 0 ? (
        <FlatList
          data={earthquakes}
          keyExtractor={(item, index) =>
            String(
              item.earthquake_id ||
                item.id ||
                `${item.date}-${index}`
            )
          }
          renderItem={renderEarthquakeCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FC",
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F7FC",
  },

  loadingText: {
    marginTop: 12,
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
  },

  homeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    marginBottom: 14,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  homeButtonIcon: {
    color: "#182033",
    fontSize: 24,
    fontWeight: "900",
  },

  headerArea: {
    alignItems: "center",
    marginBottom: 12,
  },

  pageTitle: {
    color: "#182033",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },

  pageSubtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
    textAlign: "center",
  },

  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },

  statusDotLive: {
    backgroundColor: "#16A34A",
  },

  statusDotCache: {
    backgroundColor: "#F59E0B",
  },

  sourceText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },

  updatedText: {
    color: "#94A3B8",
    fontSize: 11,
    marginBottom: 14,
    marginTop: 5,
    textAlign: "center",
  },

  warningBox: {
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    marginBottom: 14,
    padding: 13,
  },

  warningTitle: {
    color: "#9A3412",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },

  warningText: {
    color: "#9A3412",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
  },

  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    marginTop: 6,
    padding: 16,
  },

  errorTitle: {
    color: "#B91C1C",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 6,
  },

  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    lineHeight: 20,
  },

  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginTop: 6,
    padding: 16,
  },

  emptyTitle: {
    color: "#182033",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 6,
  },

  emptyText: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
  },

  retryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#5361FF",
    borderRadius: 12,
    marginTop: 14,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  listContent: {
    paddingBottom: 24,
    paddingTop: 4,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginBottom: 14,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  cardTitleArea: {
    flex: 1,
    paddingRight: 12,
  },

  location: {
    color: "#182033",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
  },

  distance: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 5,
  },

  magnitudeBadge: {
    alignItems: "center",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 46,
    minWidth: 46,
    paddingHorizontal: 8,
  },

  magnitudeLow: {
    backgroundColor: "#DCFCE7",
  },

  magnitudeMedium: {
    backgroundColor: "#FEF3C7",
  },

  magnitudeHigh: {
    backgroundColor: "#FEE2E2",
  },

  magnitudeText: {
    color: "#182033",
    fontSize: 18,
    fontWeight: "900",
  },

  divider: {
    backgroundColor: "#E2E8F0",
    height: 1,
    marginBottom: 12,
    marginTop: 14,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },

  infoIcon: {
    fontSize: 14,
    marginRight: 7,
  },

  infoText: {
    color: "#64748B",
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});