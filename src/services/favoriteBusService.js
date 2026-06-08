import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSavedUser } from "./authService";

const FAVORITE_BUS_STORAGE_PREFIX =
  "bandirma_cepte_favorite_bus_lines";

async function getStorageKey() {
  const user = await getSavedUser();

  const userIdentifier =
    user?.id ||
    user?.email ||
    "guest";

  return `${FAVORITE_BUS_STORAGE_PREFIX}_${userIdentifier}`;
}

export async function getFavoriteBusLineIds() {
  try {
    const storageKey = await getStorageKey();

    const savedFavorites =
      await AsyncStorage.getItem(storageKey);

    if (!savedFavorites) {
      return [];
    }

    const parsedFavorites =
      JSON.parse(savedFavorites);

    if (!Array.isArray(parsedFavorites)) {
      return [];
    }

    return parsedFavorites.map(String);
  } catch (error) {
    console.log(
      "FAVORİ OTOBÜS OKUMA HATASI:",
      error.message
    );

    return [];
  }
}

export async function toggleFavoriteBusLine(lineId) {
  try {
    const storageKey = await getStorageKey();

    const favoriteIds =
      await getFavoriteBusLineIds();

    const normalizedLineId =
      String(lineId);

    const isAlreadyFavorite =
      favoriteIds.includes(normalizedLineId);

    const updatedFavoriteIds =
      isAlreadyFavorite
        ? favoriteIds.filter(
            (id) => id !== normalizedLineId
          )
        : [
            ...favoriteIds,
            normalizedLineId,
          ];

    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify(updatedFavoriteIds)
    );

    return updatedFavoriteIds;
  } catch (error) {
    console.log(
      "FAVORİ OTOBÜS GÜNCELLEME HATASI:",
      error.message
    );

    throw new Error(
      "Favori bilgisi kaydedilemedi."
    );
  }
}