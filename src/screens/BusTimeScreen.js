import React, {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { busLines } from "../data/busTimes";
import {
  getFavoriteBusLineIds,
  toggleFavoriteBusLine,
} from "../services/favoriteBusService";

export default function BusTimeScreen({
  navigation,
}) {
  const [favoriteIds, setFavoriteIds] =
    useState([]);

  const today = new Date().getDay();

  function getTodayType() {
    if (today === 0) {
      return "sunday";
    }

    if (today === 6) {
      return "saturday";
    }

    return "weekday";
  }

  const todayType = getTodayType();

  const loadFavorites =
    useCallback(async () => {
      const savedFavoriteIds =
        await getFavoriteBusLineIds();

      setFavoriteIds(savedFavoriteIds);
    }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
  );

  async function handleToggleFavorite(lineId) {
    try {
      const updatedFavoriteIds =
        await toggleFavoriteBusLine(lineId);

      setFavoriteIds(updatedFavoriteIds);
    } catch (error) {
      console.log(
        "FAVORİ BUTONU HATASI:",
        error.message
      );
    }
  }

  function getNextBus(times) {
    const now = new Date();

    const currentMinutes =
      now.getHours() * 60 +
      now.getMinutes();

    return times.find((time) => {
      const [hour, minute] =
        time.split(":").map(Number);

      return (
        hour * 60 + minute >
        currentMinutes
      );
    });
  }

  function isFavorite(lineId) {
    return favoriteIds.includes(
      String(lineId)
    );
  }

  const favoriteLines = useMemo(() => {
    return busLines.filter((line) =>
      favoriteIds.includes(String(line.id))
    );
  }, [favoriteIds]);

  function renderBusLineCard(line) {
    const times =
      Array.isArray(line[todayType])
        ? line[todayType]
        : [];

    const nextBus =
      getNextBus(times);

    const lineIsFavorite =
      isFavorite(line.id);

    return (
      <View
        key={line.id}
        style={[
          styles.card,
          lineIsFavorite &&
            styles.favoriteCard,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleArea}>
            <Text style={styles.lineName}>
              {line.name}
            </Text>

            <Text style={styles.route}>
              {line.route}
            </Text>
          </View>

          <Pressable
            style={[
              styles.favoriteButton,
              lineIsFavorite &&
                styles.favoriteButtonActive,
            ]}
            onPress={() =>
              handleToggleFavorite(line.id)
            }
            accessibilityLabel={
              lineIsFavorite
                ? "Favorilerden çıkar"
                : "Favorilere ekle"
            }
          >
            <Text
              style={[
                styles.favoriteIcon,
                lineIsFavorite &&
                  styles.favoriteIconActive,
              ]}
            >
              {lineIsFavorite
                ? "★"
                : "☆"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.nextBus}>
          Sonraki Otobüs:{" "}
          {nextBus ||
            "Bugün başka sefer yok"}
        </Text>

        {times.length > 0 ? (
          <View style={styles.timeContainer}>
            {times.map((time, index) => (
              <View
                key={`${line.id}-${time}-${index}`}
                style={[
                  styles.timeBox,
                  time === nextBus &&
                    styles.nextTimeBox,
                ]}
              >
                <Text
                  style={[
                    styles.timeText,
                    time === nextBus &&
                      styles.nextTimeText,
                  ]}
                >
                  {time}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noScheduleText}>
            Bugün için sefer bilgisi bulunmuyor.
          </Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.contentContainer
      }
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        style={styles.homeButton}
        onPress={() =>
          navigation.navigate("Home")
        }
      >
        <Text style={styles.homeButtonIcon}>
          ⌂
        </Text>
      </Pressable>

      <Text style={styles.pageTitle}>
        Otobüs Saatleri
      </Text>

      <Text style={styles.subtitle}>
        Bandırma şehir içi otobüs hatları
      </Text>

      <View style={styles.favoriteSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>
            ★
          </Text>

          <View>
            <Text style={styles.sectionTitle}>
              Favori Hatlarım
            </Text>

            <Text style={styles.sectionSubtitle}>
              Sık kullandığınız hatlara
              hızlıca ulaşın
            </Text>
          </View>
        </View>

        {favoriteLines.length > 0 ? (
          favoriteLines.map((line) => {
            const times =
              Array.isArray(line[todayType])
                ? line[todayType]
                : [];

            const nextBus =
              getNextBus(times);

            return (
              <View
                key={`favorite-${line.id}`}
                style={styles.favoriteSummaryCard}
              >
                <View
                  style={
                    styles.favoriteSummaryTextArea
                  }
                >
                  <Text
                    style={
                      styles.favoriteSummaryName
                    }
                  >
                    {line.name}
                  </Text>

                  <Text
                    style={
                      styles.favoriteSummaryRoute
                    }
                  >
                    {line.route}
                  </Text>

                  <Text
                    style={
                      styles.favoriteSummaryNextBus
                    }
                  >
                    Sonraki Otobüs:{" "}
                    {nextBus ||
                      "Bugün başka sefer yok"}
                  </Text>
                </View>

                <Pressable
                  style={
                    styles.removeFavoriteButton
                  }
                  onPress={() =>
                    handleToggleFavorite(line.id)
                  }
                >
                  <Text
                    style={
                      styles.removeFavoriteIcon
                    }
                  >
                    ★
                  </Text>
                </Pressable>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyFavoriteBox}>
            <Text
              style={styles.emptyFavoriteTitle}
            >
              Henüz favori hattınız yok
            </Text>

            <Text
              style={styles.emptyFavoriteText}
            >
              Aşağıdaki hatların yanındaki yıldız
              simgesine basarak favori
              ekleyebilirsiniz.
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.allLinesTitle}>
        Tüm Hatlar
      </Text>

      {busLines.map(renderBusLineCard)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FC",
  },

  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 30,
  },

  homeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    alignSelf: "center",
    justifyContent: "center",
    marginBottom: 18,
    elevation: 4,
  },

  homeButtonIcon: {
    fontSize: 20,
    color: "#182033",
    fontWeight: "800",
  },

  pageTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#182033",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    color: "#8898B0",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 6,
  },

  favoriteSection: {
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
    padding: 15,
    marginBottom: 22,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionIcon: {
    fontSize: 23,
    color: "#F59E0B",
    marginRight: 10,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#182033",
  },

  sectionSubtitle: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },

  emptyFavoriteBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 13,
  },

  emptyFavoriteTitle: {
    color: "#182033",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },

  emptyFavoriteText: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
  },

  favoriteSummaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 13,
    marginBottom: 9,
  },

  favoriteSummaryTextArea: {
    flex: 1,
    paddingRight: 10,
  },

  favoriteSummaryName: {
    color: "#182033",
    fontSize: 14,
    fontWeight: "900",
  },

  favoriteSummaryRoute: {
    color: "#8898B0",
    fontSize: 12,
    marginTop: 3,
  },

  favoriteSummaryNextBus: {
    color: "#5361FF",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 7,
  },

  removeFavoriteButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF7ED",
  },

  removeFavoriteIcon: {
    color: "#F59E0B",
    fontSize: 21,
  },

  allLinesTitle: {
    color: "#182033",
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },

  favoriteCard: {
    borderWidth: 1,
    borderColor: "#F59E0B",
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  cardTitleArea: {
    flex: 1,
    paddingRight: 10,
  },

  lineName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#182033",
  },

  route: {
    fontSize: 13,
    color: "#8898B0",
    marginTop: 4,
    marginBottom: 12,
  },

  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },

  favoriteButtonActive: {
    backgroundColor: "#FFF7ED",
  },

  favoriteIcon: {
    color: "#94A3B8",
    fontSize: 23,
  },

  favoriteIconActive: {
    color: "#F59E0B",
  },

  nextBus: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5361FF",
    marginBottom: 12,
  },

  timeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  timeBox: {
    backgroundColor: "#E8F4FF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },

  timeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#182033",
  },

  nextTimeBox: {
    backgroundColor: "#007BFF",
  },

  nextTimeText: {
    color: "#FFFFFF",
  },

  noScheduleText: {
    color: "#94A3B8",
    fontSize: 13,
    fontStyle: "italic",
  },
});