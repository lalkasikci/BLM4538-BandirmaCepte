import { NEWS_API_URL } from "../config/api";

export async function getBandirmaNews() {
  const response = await fetch(NEWS_API_URL);

  if (!response.ok) {
    throw new Error(`Haber verisi alınamadı: ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Beklenmeyen haber veri formatı");
  }

  return data.map((item, index) => {
    const publishedAt = item.publishedAt || "";

    return {
      id: item.id || String(index),
      title: item.title || "Başlık bulunamadı",
      summary: item.summary || "Özet bulunamadı",
      link: item.link || "",
      image: item.image || "",
      imageUrl: item.image || "",
      publishedAt,
      timeAgo: formatTimeAgo(publishedAt),
      source: item.source || "Pandermos",
    };
  });
}

function formatTimeAgo(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const differenceInMinutes = Math.floor(
    (Date.now() - date.getTime()) / 60000
  );

  if (differenceInMinutes < 1) {
    return "Az önce";
  }

  if (differenceInMinutes < 60) {
    return `${differenceInMinutes} dakika önce`;
  }

  const differenceInHours = Math.floor(
    differenceInMinutes / 60
  );

  if (differenceInHours < 24) {
    return `${differenceInHours} saat önce`;
  }

  const differenceInDays = Math.floor(
    differenceInHours / 24
  );

  return `${differenceInDays} gün önce`;
}