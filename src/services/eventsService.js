import { EVENTS_API_URL } from '../config/api';

function normalizeEvent(event, index) {
  return {
    id: String(event.id ?? `event-${index}`),
    title: event.title || 'Başlıksız etkinlik',
    category: event.category || 'Etkinlik',
    date: event.date || 'Tarih bilgisi resmî sayfada',
    time: event.time || 'Saat bilgisi resmî sayfada',
    location: event.location || 'Konum bilgisi resmî sayfada',
    description:
      event.description ||
      'Etkinlik ayrıntılarını resmî internet sayfasından görüntüleyebilirsiniz.',
    detailUrl: event.detailUrl || '',
  };
}

export async function getEvents() {
  try {
    const response = await fetch(EVENTS_API_URL);

    if (!response.ok) {
      throw new Error('Etkinlik verileri alınamadı.');
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Etkinlik verisi beklenen formatta değil.');
    }

    return {
      events: data.map(normalizeEvent),
      errorMessage: '',
    };
  } catch (error) {
    console.log('ETKİNLİK SERVİS HATASI:', error.message);

    return {
      events: [],
      errorMessage: 'Etkinlik bilgilerine şu anda ulaşılamıyor.',
    };
  }
}