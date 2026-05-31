const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const app = express();

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

app.get("/events", async (req, res) => {
  try {
    const url = "https://www.bandirma.bel.tr/etkinlikler";

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
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
      const title = $(element).text().replace(/\s+/g, " ").trim();
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
        index === self.findIndex((item) => item.title === event.title)
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

app.listen(PORT, () => {
  console.log(`Backend çalışıyor: http://localhost:${PORT}`);
});