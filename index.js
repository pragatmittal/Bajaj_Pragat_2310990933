require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { fibonacciSeries, filterPrimes, gcdArray, lcmArray, isInteger } = require('./bfhl');

const app = express();
app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(cors());

const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use(limiter);

const PORT = process.env.PORT || 3000;
const OFFICIAL_EMAIL = process.env.OFFICIAL_EMAIL || 'YOUR CHITKARA EMAIL';

function successPayload(data) {
  return {
    is_success: true,
    official_email: OFFICIAL_EMAIL,
    data
  };
}

function errorPayload(message) {
  return {
    is_success: false,
    official_email: OFFICIAL_EMAIL,
    error: message
  };
}

app.get('/health', (req, res) => {
  return res.status(200).json({ is_success: true, official_email: OFFICIAL_EMAIL });
});

app.post('/bfhl', async (req, res) => {
  try {
    if (!req.is('application/json')) {
      return res.status(415).json(errorPayload('Content-Type must be application/json'));
    }

    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json(errorPayload('Request body must be a JSON object'));
    }

    const keys = Object.keys(body || {});
    if (keys.length !== 1) {
      return res.status(400).json(errorPayload('Request must contain exactly one of: fibonacci, prime, lcm, hcf, AI'));
    }

    const key = keys[0];

    switch (key) {
      case 'fibonacci': {
        const n = body.fibonacci;
        if (!isInteger(n) || n < 0 || n > 1000) {
          return res.status(400).json(errorPayload('fibonacci must be an integer between 0 and 1000'));
        }
        const data = fibonacciSeries(n);
        return res.status(200).json(successPayload(data));
      }

      case 'prime': {
        const arr = body.prime;
        if (!Array.isArray(arr) || arr.length > 10000) {
          return res.status(400).json(errorPayload('prime must be an array of integers (max length 10000)'));
        }
        const nums = arr.map((v) => Number(v));
        if (!nums.every((v) => isInteger(v))) {
          return res.status(400).json(errorPayload('prime array must contain only integers'));
        }
        const data = filterPrimes(nums);
        return res.status(200).json(successPayload(data));
      }

      case 'lcm': {
        const arr = body.lcm;
        if (!Array.isArray(arr) || arr.length === 0 || arr.length > 10000) {
          return res.status(400).json(errorPayload('lcm must be a non-empty array of integers (max length 10000)'));
        }
        const nums = arr.map((v) => Number(v));
        if (!nums.every((v) => isInteger(v))) {
          return res.status(400).json(errorPayload('lcm array must contain only integers'));
        }
        const data = lcmArray(nums);
        return res.status(200).json(successPayload(data));
      }

      case 'hcf': {
        const arr = body.hcf;
        if (!Array.isArray(arr) || arr.length === 0 || arr.length > 10000) {
          return res.status(400).json(errorPayload('hcf must be a non-empty array of integers (max length 10000)'));
        }
        const nums = arr.map((v) => Number(v));
        if (!nums.every((v) => isInteger(v))) {
          return res.status(400).json(errorPayload('hcf array must contain only integers'));
        }
        const data = gcdArray(nums);
        return res.status(200).json(successPayload(data));
      }

      case 'AI': {
        const q = body.AI;
        if (typeof q !== 'string' || !q.trim() || q.length > 2000) {
          return res.status(400).json(errorPayload('AI must be a non-empty question string (max 2000 chars)'));
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return res.status(501).json(errorPayload('AI integration not configured. Provide GEMINI_API_KEY in environment'));
        }

        // Placeholder: call external AI provider (Google Gemini) using fetch.
        // Implementation expects a valid GEMINI_API_KEY and endpoint in GEMINI_API_URL
        const geminiUrl = process.env.GEMINI_API_URL || 'https://api.example.com/v1/generate';

        try {
          const resp = await fetch(geminiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({ prompt: q, max_tokens: 16 })
          });

          if (!resp.ok) {
            return res.status(502).json(errorPayload('AI provider returned an error'));
          }
          const json = await resp.json();
          // Attempt to extract a single-word answer safely
          let answer = null;
          if (typeof json === 'string') answer = json;
          else if (json?.output && typeof json.output === 'string') answer = json.output;
          else if (json?.choices && Array.isArray(json.choices) && json.choices[0]) answer = json.choices[0].text || json.choices[0].message?.content;

          if (!answer) answer = String(json);
          // Trim to first word as requirement
          const single = answer.toString().trim().split(/\s+/)[0];
          return res.status(200).json(successPayload(single));
        } catch (err) {
          return res.status(502).json(errorPayload('Failed to contact AI provider'));
        }
      }

      default:
        return res.status(400).json(errorPayload('Unknown key. Use one of: fibonacci, prime, lcm, hcf, AI'));
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorPayload('Internal server error'));
  }
});

app.use((req, res) => {
  res.status(404).json(errorPayload('Not Found'));
});

app.listen(PORT, () => {
  console.log(`BFHL API listening on port ${PORT}`);
});
