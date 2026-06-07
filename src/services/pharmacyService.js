import { PHARMACY_API_URL } from "../config/api";

export async function getDutyPharmacies() {
  try {
    const response = await fetch(PHARMACY_API_URL);

    if (!response.ok) {
      throw new Error(
        `Nöbetçi eczane verisi alınamadı: ${response.status}`
      );
    }

    const data = await response.json();

    return {
      date: data.date || "Bugün",
      pharmacies: Array.isArray(data.pharmacies)
        ? data.pharmacies
        : [],
    };
  } catch (error) {
    console.log(
      "NÖBETÇİ ECZANE SERVİS HATASI:",
      error.message
    );

    return {
      date: "Bugün",
      pharmacies: [],
    };
  }
}