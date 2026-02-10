const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* ================= HELPER FUNCTIONS ================= */

function fibonacci(n) {
  let a = 0, b = 1;
  const result = [];
  for (let i = 0; i < n; i++) {
    result.push(a);
    [a, b] = [b, a + b];
  }
  return result;
}

function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i <= Math.sqrt(n); i++) {
    if (n % i === 0) return false;
  }
  return true;
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function hcf(arr) {
  return arr.reduce((a, b) => gcd(a, b));
}

function lcm(arr) {
  return arr.reduce((a, b) => (a * b) / gcd(a, b));
}

/* ================= ROUTES ================= */

app.get("/health", (req, res) => {
  res.status(200).json({
    is_success: true,
    official_email: process.env.OFFICIAL_EMAIL,
  });
});

app.post("/bfhl", async (req, res) => {
  try {
    const body = req.body;

    if (!body || typeof body !== "object") {
      return res.status(400).json({
        is_success: false,
        error: "Invalid request body",
      });
    }

    let data;

    if ("fibonacci" in body) {
      if (!Number.isInteger(body.fibonacci)) {
        throw "Fibonacci input must be an integer";
      }
      data = fibonacci(body.fibonacci);

    } else if ("prime" in body) {
      if (!Array.isArray(body.prime)) {
        throw "Prime input must be an array";
      }
      data = body.prime.filter(isPrime);

    } else if ("lcm" in body) {
      if (!Array.isArray(body.lcm)) {
        throw "LCM input must be an array";
      }
      data = lcm(body.lcm);

    } else if ("hcf" in body) {
      if (!Array.isArray(body.hcf)) {
        throw "HCF input must be an array";
      }
      data = hcf(body.hcf);

    } else if ("AI" in body) {
      if (typeof body.AI !== "string") {
        throw "AI input must be a string";
      }

      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Answer in ONE WORD only.\nQuestion: ${body.AI}`
                }
              ]
            }
          ]
        },
        {
          headers: {
            "Content-Type": "application/json"
          },
          params: {
            key: process.env.GEMINI_API_KEY
          }
        }
      );

      data =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        "NO_RESPONSE";

    } else {
      throw "Invalid key in request body";
    }

    res.status(200).json({
      is_success: true,
      official_email: process.env.OFFICIAL_EMAIL,
      data: data,
    });

  } catch (err) {
    res.status(400).json({
      is_success: false,
      error: err.toString(),
    });
  }
});

/* ================= SERVER ================= */

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});