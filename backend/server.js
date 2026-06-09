const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");
const Parser = require("rss-parser");
const fs = require("fs");
const path = require("path");
const https = require("https");
const iconv = require("iconv-lite");

const app = express();
const rssParser = new Parser({
  customFields: {
    item: [["content:encoded", "contentEncoded"]],
  },
});
const PORT = 3000;

// Geliştirme ortamı için kullanıyoruz.
// Daha sonra .env dosyasına taşıyabiliriz.
const JWT_SECRET = process.env.JWT_SECRET || "bandirma-cepte-dev-secret";

app.use(cors());
app.use(express.json());

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

function requireAuth(req, res, next) {
  const authorizationHeader = req.headers.authorization || "";

  const token = authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.substring(7)
    : "";

  if (!token) {
    return res.status(401).json({
      message: "Oturum bilgisi bulunamadı.",
    });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Oturum süresi dolmuş veya geçersiz.",
    });
  }
}

// ----------------------------------------------------
// KULLANICI KAYIT İŞLEMİ
// ----------------------------------------------------

app.post("/auth/register", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "Geçerli bir e-posta adresi giriniz.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Şifre en az 6 karakter olmalıdır.",
      });
    }

    db.get(
      "SELECT id FROM users WHERE email = ?",
      [email],
      async (selectError, existingUser) => {
        if (selectError) {
          console.log("KULLANICI SORGULAMA HATASI:", selectError.message);

          return res.status(500).json({
            message: "Kullanıcı kaydı sırasında bir hata oluştu.",
          });
        }

        if (existingUser) {
          return res.status(409).json({
            message: "Bu e-posta adresi ile daha önce kayıt olunmuş.",
          });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        db.run(
          `
            INSERT INTO users (email, password_hash)
            VALUES (?, ?)
          `,
          [email, passwordHash],
          function insertUser(insertError) {
            if (insertError) {
              console.log("KULLANICI EKLEME HATASI:", insertError.message);

              return res.status(500).json({
                message: "Kullanıcı kaydı tamamlanamadı.",
              });
            }

            const user = {
              id: this.lastID,
              email,
            };

            const token = createToken(user);

            return res.status(201).json({
              message: "Kayıt işlemi başarılı.",
              user,
              token,
            });
          }
        );
      }
    );
  } catch (error) {
    console.log("REGISTER ERROR:", error.message);

    return res.status(500).json({
      message: "Kayıt işlemi sırasında bir hata oluştu.",
    });
  }
});

// ----------------------------------------------------
// KULLANICI GİRİŞ İŞLEMİ
// ----------------------------------------------------

app.post("/auth/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        message: "E-posta ve şifre alanları zorunludur.",
      });
    }

    db.get(
      `
        SELECT id, email, password_hash
        FROM users
        WHERE email = ?
      `,
      [email],
      async (selectError, user) => {
        if (selectError) {
          console.log("LOGIN SORGULAMA HATASI:", selectError.message);

          return res.status(500).json({
            message: "Giriş işlemi sırasında bir hata oluştu.",
          });
        }

        if (!user) {
          return res.status(401).json({
            message: "E-posta veya şifre hatalı.",
          });
        }

        const passwordIsCorrect = await bcrypt.compare(
          password,
          user.password_hash
        );

        if (!passwordIsCorrect) {
          return res.status(401).json({
            message: "E-posta veya şifre hatalı.",
          });
        }

        const safeUser = {
          id: user.id,
          email: user.email,
        };

        const token = createToken(safeUser);

        return res.json({
          message: "Giriş işlemi başarılı.",
          user: safeUser,
          token,
        });
      }
    );
  } catch (error) {
    console.log("LOGIN ERROR:", error.message);

    return res.status(500).json({
      message: "Giriş işlemi sırasında bir hata oluştu.",
    });
  }
});

// ----------------------------------------------------
// OTURUM KONTROLÜ
// ----------------------------------------------------

app.get("/auth/me", requireAuth, (req, res) => {
  db.get(
    `
      SELECT id, email, created_at
      FROM users
      WHERE id = ?
    `,
    [req.user.userId],
    (selectError, user) => {
      if (selectError) {
        console.log("KULLANICI BİLGİSİ HATASI:", selectError.message);

        return res.status(500).json({
          message: "Kullanıcı bilgisi alınamadı.",
        });
      }

      if (!user) {
        return res.status(404).json({
          message: "Kullanıcı bulunamadı.",
        });
      }

      return res.json({
        user,
      });
    }
  );
});

// ----------------------------------------------------
// ETKİNLİKLER
// ----------------------------------------------------

// ----------------------------------------------------
// HABERLER
// ----------------------------------------------------

app.get("/news", async (req, res) => {
  try {
    const response = await axios.get('https://www.bandirma.bel.tr/haberler', {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const $ = cheerio.load(response.data);
    const items = [];

    $('div.news-card').each((index, card) => {
      const parentLink = $(card).closest('a');
      const link = parentLink.attr('href') || '';
      const image = $(card).find('div.news-image img').attr('src') || null;
      const title = $(card).find('div.title').text().trim() || 'Başlık yok';
      const publishedAt = $(card).find('div.date').text().trim() || '';
      const fullLink = link.startsWith('http') ? link : `https://www.bandirma.bel.tr${link}`;
      const fullImage = image && image.startsWith('http') ? image : image ? `https://www.bandirma.bel.tr${image}` : null;

      items.push({
        id: fullLink || String(index),
        title,
        summary: '',
        link: fullLink,
        image: fullImage,
        publishedAt,
        source: 'Bandırma Belediyesi',
      });
    });

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Haber verisi alınamadı.');
    }

    return res.json(items.slice(0, 15));
  } catch (error) {
    console.log('NEWS ERROR:', error.message);

    return res.status(500).json({
      message: 'Haberler alınamadı.',
      error: error.message,
    });
  }
});

function cleanHtml(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractImage(item) {
  if (item.enclosure?.link) return item.enclosure.link;
  if (item.thumbnail) return item.thumbnail;

  const match = item.description?.match(/<img[^>]+src="([^"]+)"/);
  return match ? match[1] : null;
}

// ----------------------------------------------------
// YARDIMCI FONKSİYONLAR
// ----------------------------------------------------

function cleanHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractImage(item) {
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }

  if (item.enclosure?.link) {
    return item.enclosure.link;
  }

  if (item.thumbnail) {
    return item.thumbnail;
  }

  const html =
    item.contentEncoded ||
    item.content ||
    item.summary ||
    item.description ||
    "";

  const match = String(html).match(
    /<img[^>]+src=["']([^"']+)["']/i
  );

  return match ? match[1] : "";
}


// ----------------------------------------------------
// DEPREMLER - KANDİLLİ RASATHANESİ
// ----------------------------------------------------

let cachedKandilliEarthquakes = [];
let cachedKandilliUpdatedAt = null;
function cleanKandilliLocation(locationText) {
  return String(locationText || "")
    .replace(
      /\s+(İLKSEL|İlksel|REVİZE\d*|REVIZE\d*)\s*$/iu,
      ""
    )
    .trim();
}
function parseKandilliEarthquakes(rawText) {
  const lines = String(rawText || "").split("\n");

  const earthquakes = [];

  for (const line of lines) {
    const cleanLine = line.replace(/\s+/g, " ").trim();

    // Örnek satır biçimi:
    // 2026.06.07 12:34:56 40.1234 27.1234 7.0 -.- 2.4 -.- KONUM
    const match = cleanLine.match(
      /^(\d{4}\.\d{2}\.\d{2})\s+(\d{2}:\d{2}:\d{2})\s+(-?\d+\.\d+)\s+(-?\d+\.\d+)\s+(-?\d+(?:\.\d+)?)\s+\S+\s+(-?\d+(?:\.\d+)?)\s+\S+\s+(.+)$/
    );

    if (!match) {
      continue;
    }

    const [
      ,
      datePart,
      timePart,
      latitudeText,
      longitudeText,
      depthText,
      magnitudeText,
      locationText,
    ] = match;

    const latitude = Number(latitudeText);
    const longitude = Number(longitudeText);
    const depth = Number(depthText);
    const magnitude = Number(magnitudeText);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(magnitude)
    ) {
      continue;
    }

    const isoDate = `${datePart.replace(/\./g, "-")}T${timePart}`;

    earthquakes.push({
      earthquake_id:
        `kandilli-${datePart}-${timePart}-${latitude}-${longitude}`,

  title:
  cleanKandilliLocation(locationText) ||
  "Konum bilgisi bulunamadı",

      mag: magnitude,

      depth:
        Number.isFinite(depth)
          ? depth
          : null,

      date: isoDate,

      latitude,
      longitude,

      geojson: {
        type: "Point",
        coordinates: [
          longitude,
          latitude,
        ],
      },

      provider: "Kandilli Rasathanesi",
    });
  }

  return earthquakes;
}

app.get("/earthquakes", async (req, res) => {
  try {
    const kandilliUrl =
      "http://www.koeri.boun.edu.tr/scripts/lst9.asp";

    console.log("Deprem verisi isteniyor: Kandilli Rasathanesi");

    const response = await axios.get(kandilliUrl, {
  headers: {
    "User-Agent": "Mozilla/5.0",
    Accept: "text/html,text/plain,*/*",
  },

  timeout: 12000,

  // Metni doğrudan okumuyoruz.
  // Önce ham byte verisini alıyoruz.
  responseType: "arraybuffer",
});

// Kandilli sayfasındaki Türkçe karakterleri doğru çözüyoruz.
const decodedText = iconv.decode(
  Buffer.from(response.data),
  "windows-1254"
);

const earthquakes =
  parseKandilliEarthquakes(decodedText);


    if (earthquakes.length === 0) {
      throw new Error(
        "Kandilli verisi alınamadı veya sayfa biçimi değişti."
      );
    }

    cachedKandilliEarthquakes = earthquakes;
    cachedKandilliUpdatedAt =
      new Date().toISOString();

    console.log(
      `Kandilli verisi alındı: ${earthquakes.length} kayıt`
    );

    return res.json({
      status: true,
      source: "Kandilli Rasathanesi",
      isLive: true,
      updatedAt: cachedKandilliUpdatedAt,
      result: earthquakes,
    });
  } catch (error) {
    console.log(
      "KANDİLLİ VERİ HATASI:",
      error.message
    );

    if (cachedKandilliEarthquakes.length > 0) {
      return res.json({
        status: true,
        source: "Kandilli Rasathanesi - Önbellek",
        isLive: false,
        updatedAt: cachedKandilliUpdatedAt,
        warning:
          "Canlı Kandilli verisine ulaşılamadı. Son başarılı kayıtlar gösteriliyor.",
        result: cachedKandilliEarthquakes,
      });
    }

    return res.status(503).json({
      status: false,
      source: "Kandilli Rasathanesi",
      isLive: false,
      message:
        "Deprem verilerine şu anda ulaşılamıyor.",
      result: [],
    });
  }
});
// ----------------------------------------------------
// NÖBETÇİ ECZANELER
// ----------------------------------------------------

app.get("/pharmacies", async (req, res) => {
  try {
    const pharmacyUrl =
      "https://www.bandirma.bel.tr/nobetci-eczane";

    const response = await axios.get(pharmacyUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      timeout: 10000,
    });

    const text = cleanHtml(response.data);

    const dateMatch = text.match(
      /(\d{2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s+\d{4})\s+Bugün Nöbetçi Eczaneler/
    );

    const date = dateMatch ? dateMatch[1] : "Bugün";

    const start = text.indexOf("Eczane Adı Adres Telefon");
    const end = text.indexOf("ARA", start);

    if (start === -1) {
      return res.json({
        date,
        pharmacies: [],
      });
    }

    const pharmacyText = text.slice(
      start,
      end === -1 ? undefined : end
    );

    const pharmacyRegex =
      /([A-ZÇĞİÖŞÜ0-9\s.'-]+ECZANESİ)\s+(.+?)\s+(0\s?\d{3}\s?\d{3}\s?\d{2}\s?\d{2})/g;

    const pharmacies = [];
    let match;

    while ((match = pharmacyRegex.exec(pharmacyText)) !== null) {
      pharmacies.push({
        id: String(pharmacies.length + 1),
        name: match[1].trim(),
        address: match[2].trim(),
        phone: match[3].replace(/\s+/g, ""),
      });
    }

    return res.json({
      date,
      pharmacies,
    });
  } catch (error) {
    console.log("PHARMACY ERROR:", error.message);

    return res.status(500).json({
      message: "Nöbetçi eczane verileri alınamadı.",
      error: error.message,
    });
  }
});

// ----------------------------------------------------
// ETKİNLİKLER
// ----------------------------------------------------

app.get("/events", async (req, res) => {
  try {
    const url = "https://www.bandirma.bel.tr/etkinlikler";

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const events = [];

    const unwantedTitles = [
      "HIZLI MENÜ",
      "BİZE ULAŞIN",
      "CANLI YAYIN",
      "TÜMÜ",
      "EĞİTİM",
      "SOSYAL",
      "BAYRAM",
      "TİYATROLAR",
      "SERGİLER",
      "KONSER - DİNLETİLER",
      "SÖYLEŞİ VE PANELLER",
      "FİLM GÖSTERİMLERİ",
      "DETAYLI BİLGİ",
      "DİĞER ETKİNLİKLER",
      "AÇILIŞ",
      "KİTAP GÜNLERİ",
      "YARIYIL ŞENLİĞİ",
      "RAMAZAN AYI ETKİNLİKLERİ",
    ];

    $("a").each((index, element) => {
      const title = $(element)
        .text()
        .replace(/\s+/g, " ")
        .trim();

      const href = $(element).attr("href");

      const isRealEvent =
        href &&
        href.includes("etkinlik") &&
        title.length > 8 &&
        !unwantedTitles.includes(title.toUpperCase());

      if (isRealEvent) {
        events.push({
          id: String(index),
          title,
          detailUrl: href.startsWith("http")
            ? href
            : `https://www.bandirma.bel.tr${href}`,
          category: "Bandırma Belediyesi Etkinliği",
        });
      }
    });

    const uniqueEvents = events.filter(
      (event, index, self) =>
        index ===
        self.findIndex((item) => item.title === event.title)
    );

    return res.json(uniqueEvents);
  } catch (error) {
    console.log("EVENT ERROR:", error.message);

    return res.status(500).json({
      message: "Etkinlik verileri alınamadı.",
      error: error.message,
    });
  }
});
// ----------------------------------------------------
// OTOBÜS HATLARI VE KALKIŞ SAATLERİ
// ----------------------------------------------------

const BUS_LIST_URL =
  "https://www.bandirmaulasim.com/yolculuk/kalkis-saatleri.html";

const BUS_CACHE_DURATION_MS =
  30 * 60 * 1000;

let cachedBusLines = [];
let cachedBusLinesUpdatedAt = null;

function normalizeBusText(text) {
  return String(text || "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeBusLabel(text) {
  return normalizeBusText(text)
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/Ş/g, "S")
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C");
}

function extractBusTimes(text) {
  const matches =
    String(text || "").match(
      /\b(?:[01]\d|2[0-3]):[0-5]\d\b/g
    ) || [];

  return [...new Set(matches)].sort(
    (firstTime, secondTime) => {
      const [firstHour, firstMinute] =
        firstTime.split(":").map(Number);

      const [secondHour, secondMinute] =
        secondTime.split(":").map(Number);

      return (
        firstHour * 60 +
        firstMinute -
        (secondHour * 60 + secondMinute)
      );
    }
  );
}

function detectBusDayType(text) {
  const normalized =
    normalizeBusLabel(text);

  if (
    normalized.includes("HAFTA ICI") ||
    normalized.includes("HAFTAICI") ||
    normalized.includes("PAZARTESI") ||
    normalized.includes("CUMA")
  ) {
    return "weekday";
  }

  if (
    normalized.includes("CUMARTESI")
  ) {
    return "saturday";
  }

  if (
    normalized.includes("PAZAR")
  ) {
    return "sunday";
  }

  return null;
}

function mergeBusTimes(
  currentTimes,
  newTimes
) {
  return extractBusTimes([
    ...currentTimes,
    ...newTimes,
  ].join(" "));
}

function getAbsoluteBusUrl(href) {
  return new URL(
    href,
    BUS_LIST_URL
  ).href;
}

function parseBusLineId(
  name,
  index
) {
  const match =
    normalizeBusText(name).match(/^(\d+)/);

  return match
    ? match[1]
    : String(index + 1);
}

function parseBusLinePage(
  html,
  lineInfo
) {
  const $ = cheerio.load(html);

  const result = {
    id: lineInfo.id,
    name: lineInfo.name,
    route: lineInfo.route,
    detailUrl: lineInfo.detailUrl,
    weekday: [],
    saturday: [],
    sunday: [],
  };

  $("table").each((_, table) => {
    const tableText =
      normalizeBusText($(table).text());

    const previousHeading =
      normalizeBusText(
        $(table)
          .prevAll(
            "h1, h2, h3, h4, h5, strong, b, p"
          )
          .first()
          .text()
      );

    const dayType =
      detectBusDayType(
        `${previousHeading} ${tableText}`
      );

    const times =
      extractBusTimes(tableText);

    if (
      dayType &&
      times.length > 0
    ) {
      result[dayType] =
        mergeBusTimes(
          result[dayType],
          times
        );
    }
  });

  $("tr").each((_, row) => {
    const rowText =
      normalizeBusText($(row).text());

    const dayType =
      detectBusDayType(rowText);

    const times =
      extractBusTimes(rowText);

    if (
      dayType &&
      times.length > 0
    ) {
      result[dayType] =
        mergeBusTimes(
          result[dayType],
          times
        );
    }
  });

  const bodyText =
    normalizeBusText(
      $("body").text()
    );

  const daySections = [
    {
      key: "weekday",
      markers: [
        "HAFTA İÇİ",
        "HAFTA ICI",
        "HAFTAİÇİ",
      ],
    },
    {
      key: "saturday",
      markers: [
        "CUMARTESİ",
        "CUMARTESI",
      ],
    },
    {
      key: "sunday",
      markers: [
        "PAZAR",
      ],
    },
  ];

  const normalizedBody =
    normalizeBusLabel(bodyText);

  for (
    let index = 0;
    index < daySections.length;
    index += 1
  ) {
    const currentSection =
      daySections[index];

    const possibleIndexes =
      currentSection.markers
        .map((marker) =>
          normalizedBody.indexOf(
            normalizeBusLabel(marker)
          )
        )
        .filter(
          (position) => position >= 0
        );

    if (possibleIndexes.length === 0) {
      continue;
    }

    const startIndex =
      Math.min(...possibleIndexes);

    const nextSectionIndexes =
      daySections
        .slice(index + 1)
        .flatMap((section) =>
          section.markers.map(
            (marker) =>
              normalizedBody.indexOf(
                normalizeBusLabel(marker),
                startIndex + 1
              )
          )
        )
        .filter(
          (position) =>
            position > startIndex
        );

    const endIndex =
      nextSectionIndexes.length > 0
        ? Math.min(
            ...nextSectionIndexes
          )
        : bodyText.length;

    const sectionText =
      bodyText.slice(
        startIndex,
        endIndex
      );

    const sectionTimes =
      extractBusTimes(sectionText);

    if (sectionTimes.length > 0) {
      result[currentSection.key] =
        mergeBusTimes(
          result[currentSection.key],
          sectionTimes
        );
    }
  }

  const totalTimeCount =
    result.weekday.length +
    result.saturday.length +
    result.sunday.length;

  if (totalTimeCount === 0) {
    const fallbackTimes =
      extractBusTimes(bodyText);

    result.weekday =
      fallbackTimes;
  }

  return result;
}

async function fetchBusLinePage(
  lineInfo
) {
  const response = await axios.get(
    lineInfo.detailUrl,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html,*/*",
      },

      timeout: 12000,
    }
  );

  return parseBusLinePage(
    response.data,
    lineInfo
  );
}

async function fetchBusLinesFromWebsite() {
  console.log(
    "Otobüs hatları alınıyor: Bandırma Ulaşım"
  );

  const response = await axios.get(
    BUS_LIST_URL,
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html,*/*",
      },

      timeout: 12000,
    }
  );

  const $ =
    cheerio.load(response.data);

  const lineLinks = [];

  $("td.list-title a").each(
    (index, element) => {
      const name =
        normalizeBusText(
          $(element).text()
        );

      const href =
        $(element).attr("href");

      if (!href || !name) {
        return;
      }

      const id =
        parseBusLineId(
          name,
          index
        );

      lineLinks.push({
        id,
        name,
        route: name.replace(
          /^\d+\s*-\s*/,
          ""
        ),
        detailUrl:
          getAbsoluteBusUrl(href),
      });
    }
  );

  if (lineLinks.length === 0) {
    throw new Error(
      "Otobüs hat listesi bulunamadı."
    );
  }

  const lines = [];
  const failedLines = [];

  for (
    const lineInfo of lineLinks
  ) {
    try {
      console.log(
        `Otobüs hattı çekiliyor: ${lineInfo.name}`
      );

      const line =
        await fetchBusLinePage(
          lineInfo
        );

      lines.push(line);
    } catch (error) {
      console.log(
        `OTOBÜS HATTI HATASI: ${lineInfo.name}`,
        error.message
      );

      failedLines.push(
        lineInfo.name
      );
    }
  }

  if (lines.length === 0) {
    throw new Error(
      "Hiçbir otobüs hattı alınamadı."
    );
  }

  return {
    lines,
    failedLines,
  };
}

app.get(
  "/bus-lines",
  async (req, res) => {
    const cacheIsFresh =
      cachedBusLines.length > 0 &&
      cachedBusLinesUpdatedAt &&
      Date.now() -
        new Date(
          cachedBusLinesUpdatedAt
        ).getTime() <
        BUS_CACHE_DURATION_MS;

    if (cacheIsFresh) {
      return res.json({
        source:
          "Bandırma Ulaşım A.Ş. - Önbellek",
        updatedAt:
          cachedBusLinesUpdatedAt,
        warning: "",
        lines: cachedBusLines,
      });
    }

    try {
      const {
        lines,
        failedLines,
      } =
        await fetchBusLinesFromWebsite();

      cachedBusLines = lines;

      cachedBusLinesUpdatedAt =
        new Date().toISOString();

      return res.json({
        source:
          "Bandırma Ulaşım A.Ş.",
        updatedAt:
          cachedBusLinesUpdatedAt,

        warning:
          failedLines.length > 0
            ? `${failedLines.length} hattın canlı verisi alınamadı.`
            : "",

        lines,
      });
    } catch (error) {
      console.log(
        "OTOBÜS VERİ HATASI:",
        error.message
      );

      if (
        cachedBusLines.length > 0
      ) {
        return res.json({
          source:
            "Bandırma Ulaşım A.Ş. - Son başarılı kayıt",

          updatedAt:
            cachedBusLinesUpdatedAt,

          warning:
            "Canlı otobüs verilerine ulaşılamadı. Son başarılı kayıtlar gösteriliyor.",

          lines:
            cachedBusLines,
        });
      }

      return res.status(503).json({
        message:
          "Otobüs saatlerine şu anda ulaşılamıyor.",
        lines: [],
      });
    }
  }
);
// ----------------------------------------------------
// BACKEND BAŞLATMA
// ----------------------------------------------------

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend çalışıyor: http://0.0.0.0:${PORT}`);
});