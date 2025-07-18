const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const fetch = require("node-fetch");
const fs = require("fs");

dotenv.config();

const app = express();
const router = express.Router();

app.use(cors());
app.use(express.json());
app.use("/", router);

const PORT = process.env.PORT || 5000;

// ---------- ✅ Root Test Route ----------

app.get("/", (req, res) =>
  res
    .status(200)
    .send("Thompson Solomon mail & analytics server is up and running 🚀")
);

// ---------- ✅ Nodemailer Setup ----------

const contactEmail = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

contactEmail.verify((error) => {
  if (error) {
    console.error("❌ Mailer error:", error);
  } else {
    console.log("✅ Nodemailer ready");
  }
});

// ---------- ✅ Contact Form Route ----------

router.post("/contact", (req, res) => {
  const { name, email, message, phone } = req.body;

  const mail = {
    from: name,
    to: process.env.EMAIL_USER,
    subject: "Contact Form Submission - Portfolio",
    html: `
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Message:</strong><br>${message}</p>
    `,
  };

  contactEmail.sendMail(mail, (error) => {
    if (error) {
      console.error("❌ Mail sending failed:", error);
      res.status(500).json({ error: "Failed to send message" });
    } else {
      console.log("✉️ Mail sent successfully");
      res.json({ code: 200, status: "Message Sent" });
    }
  });
});

// ---------- ✅ Google Analytics API ----------

const keyPath = "/etc/secrets/key.json"; // Adjust this to match your Render Secret File mount path
let analyticsDataClient;

if (fs.existsSync(keyPath)) {
  try {
    const key = JSON.parse(fs.readFileSync(keyPath, "utf8"));

    analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: key,
    });

    console.log("✅ Google Analytics client initialized");

    router.get("/analytics", async (req, res) => {
      try {
        const [response] = await analyticsDataClient.runReport({
          property: `properties/${process.env.GA_PROPERTY_ID}`,
          dateRanges: [
            {
              startDate: "30daysAgo",
              endDate: "today",
            },
          ],
          metrics: [{ name: "activeUsers" }],
          dimensions: [{ name: "date" }],
        });

        const visitsOverTime =
          response.rows?.map((row) => ({
            date: row.dimensionValues[0].value,
            visits: Number(row.metricValues[0].value),
          })) || [];

        const totalVisitors = visitsOverTime.reduce(
          (sum, item) => sum + item.visits,
          0
        );

        res.json({
          totalVisitors,
          visitsOverTime,
        });
      } catch (error) {
        console.error("❌ Analytics error:", error);
        res
          .status(500)
          .json({ error: "Error fetching analytics data", details: error.message });
      }
    });
  } catch (err) {
    console.error("❌ Error loading key.json:", err);
  }
} else {
  console.warn("⚠ Google Analytics key.json not found. Skipping analytics route.");
}

// ---------- ✅ WakaTime Summaries Route ----------
const WAKATIME_API_KEY = process.env.WAKATIME_API_KEY;

if (!WAKATIME_API_KEY) {
  console.warn("⚠ WAKATIME_API_KEY not set. WakaTime route will not work.");
} else {
  const base64Key = Buffer.from(WAKATIME_API_KEY).toString("base64");

  router.get("/api/wakatime", async (req, res) => {
    try {
      const response = await fetch(
        "https://wakatime.com/api/v1/users/current/summaries?range=last_7_days",
        {
          headers: {
            Authorization: `Basic ${base64Key}`,
          },
        }
      );

      if (!response.ok) {
        return res
          .status(response.status)
          .json({ error: "Failed to fetch WakaTime data" });
      }

      const data = await response.json();
      res.json(data);
    } catch (err) {
      console.error("❌ WakaTime fetch error:", err);
      res.status(500).json({ error: "Server error", details: err.message });
    }
  });
}

// ---------- ✅ Start the Server ----------

app.listen(PORT, () =>
  console.log(`🚀 Server running at: http://localhost:${PORT}`)
);
