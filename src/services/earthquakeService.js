import { EARTHQUAKE_API_URL } from "../config/api";

const BANDIRMA_LAT = 40.3522;
const BANDIRMA_LON = 27.9767;

// Bandırma, Marmara ve yakın çevresini kapsar.
const MAX_DISTANCE_KM = 200;

const MAX_RESULT_COUNT = 30;

// Yaklaşık Türkiye sınırları
const TURKEY_MIN_LAT = 35.8;
const TURKEY_MAX_LAT = 42.2;
const TURKEY_MIN_LON = 25.5;
const TURKEY_MAX_LON = 45.0;

function toRadians(degree) {
  return degree * (Math.PI / 180);
}

function calculateDistanceKm(
  lat1,
  lon1,
  lat2,
  lon2
) {
  const earthRadiusKm = 6371;

  const latitudeDifference =
    toRadians(lat2 - lat1);

  const longitudeDifference =
    toRadians(lon2 - lon1);

  const value =
    Math.sin(latitudeDifference / 2) *
      Math.sin(latitudeDifference / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(longitudeDifference / 2) *
      Math.sin(longitudeDifference / 2);

  const angle =
    2 *
    Math.atan2(
      Math.sqrt(value),
      Math.sqrt(1 - value)
    );

  return earthRadiusKm * angle;
}

function isInsideTurkey(latitude, longitude) {
  return (
    latitude >= TURKEY_MIN_LAT &&
    latitude <= TURKEY_MAX_LAT &&
    longitude >= TURKEY_MIN_LON &&
    longitude <= TURKEY_MAX_LON
  );
}

function getCoordinates(item) {
  if (
    Array.isArray(item.geojson?.coordinates) &&
    item.geojson.coordinates.length >= 2
  ) {
    return {
      longitude:
        Number(item.geojson.coordinates[0]),

      latitude:
        Number(item.geojson.coordinates[1]),
    };
  }

  if (
    item.latitude != null &&
    item.longitude != null
  ) {
    return {
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
    };
  }

  return null;
}

export async function getEarthquakes() {
  const response = await fetch(
    EARTHQUAKE_API_URL
  );

  const data = await response.json();

  if (!response.ok || !data.status) {
    throw new Error(
      data.message ||
        "Deprem verilerine ulaşılamıyor."
    );
  }

  const earthquakeList =
    Array.isArray(data.result)
      ? data.result
      : [];

  const items = earthquakeList
    .map((item, index) => {
      const coordinates =
        getCoordinates(item);

      if (!coordinates) {
        return null;
      }

      const { latitude, longitude } =
        coordinates;

      const distanceKm =
        calculateDistanceKm(
          BANDIRMA_LAT,
          BANDIRMA_LON,
          latitude,
          longitude
        );

      return {
        ...item,

        earthquake_id:
          item.earthquake_id ||
          item.id ||
          `earthquake-${index}`,

        title:
          item.title ||
          item.location ||
          "Konum bilgisi bulunamadı",

        mag:
          item.mag ??
          item.magnitude ??
          "-",

        depth:
          item.depth ??
          null,

        date:
          item.date ||
          "",

        latitude,
        longitude,
        distanceKm,

        provider:
          item.provider ||
          data.source ||
          "Kandilli Rasathanesi",
      };
    })
    .filter((item) => {
      if (!item) {
        return false;
      }

      return (
        isInsideTurkey(
          item.latitude,
          item.longitude
        ) &&
        item.distanceKm <= MAX_DISTANCE_KM
      );
    })
    .sort((firstItem, secondItem) => {
      return (
        new Date(secondItem.date).getTime() -
        new Date(firstItem.date).getTime()
      );
    })
    .slice(0, MAX_RESULT_COUNT);

  return {
    items,
    warning: data.warning || "",
    isLive: data.isLive !== false,
    source:
      data.source ||
      "Kandilli Rasathanesi",

    updatedAt:
      data.updatedAt || "",
  };
}