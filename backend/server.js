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
// HABERLER
// ----------------------------------------------------

app.get("/news", async (req, res) => {
  try {
    const rssUrl = "https://www.pandermos.com/rss/";

    const response = await axios.get(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      timeout: 10000,
    });

    const feed = await rssParser.parseString(response.data);

    const news = (feed.items || []).slice(0, 20).map((item, index) => ({
      id: item.guid || item.link || String(index),
      title: item.title || "Başlık bulunamadı",
      summary: cleanHtml(
        item.contentEncoded ||
        item.content ||
        item.summary ||
        item.contentSnippet ||
        ""
      ),
      link: item.link || "",
      image: extractImage(item),
      publishedAt: item.pubDate || item.isoDate || "",
      source: feed.title || "Pandermos",
    }));

    return res.json(news);
  } catch (error) {
    console.log("NEWS ERROR:", error.message);

    return res.status(500).json({
      message: "Haber verileri alınamadı.",
      error: error.message,
    });
  }
});

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
// BACKEND BAŞLATMA
// ----------------------------------------------------

app.listen(PORT, () => {
  console.log(`Backend çalışıyor: http://localhost:${PORT}`);
});