import {
  BUS_LINES_API_URL,
} from "../config/api";

import {
  busLines as fallbackBusLines,
} from "../data/busTimes";

function fetchWithTimeout(
  url,
  timeoutMs = 15000
) {
  return Promise.race([
    fetch(url),

    new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            "Otobüs servisi zaman aşımına uğradı."
          )
        );
      }, timeoutMs);
    }),
  ]);
}

export async function getBusLines() {
  try {
    const response =
      await fetchWithTimeout(
        BUS_LINES_API_URL
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !Array.isArray(data.lines) ||
      data.lines.length === 0
    ) {
      throw new Error(
        data.message ||
          "Canlı otobüs verileri alınamadı."
      );
    }

    return {
      lines: data.lines,
      warning:
        data.warning || "",

      source:
        data.source ||
        "Bandırma Ulaşım A.Ş.",

      updatedAt:
        data.updatedAt || "",
    };
  } catch (error) {
    console.log(
      "OTOBÜS SERVİS HATASI:",
      error.message
    );

    return {
      lines:
        fallbackBusLines,

      warning:
        "Canlı otobüs saatlerine ulaşılamadı. Uygulamadaki yedek sefer bilgileri gösteriliyor.",

      source:
        "Yerel yedek veri",

      updatedAt:
        "",
    };
  }
}