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
    const keyLower = key.toLowerCase();

    switch (keyLower) {
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

      case 'ai': {
        const q = body[key];
        if (typeof q !== 'string' || !q.trim() || q.length > 2000) {
          return res.status(400).json(errorPayload('AI must be a non-empty question string (max 2000 chars)'));
        }

        // Quick deterministic shortcut for the common test question so
        // users can get the exact expected response without relying on
        // external AI providers. Normalize so variations (with/without "?",
        // extra spaces) still return the correct single-word answer.
          const normalized = q.trim().toLowerCase().replace(/\?+\.*$/, '').replace(/\s+/g, ' ').trim();
          // NOTE: do not short-circuit AI requests here; forward all queries
          // to the configured provider so responses come from Gemini.

        // Allow per-request override via headers so multiple API keys/URLs
        // can be tested without restarting the server. Headers should be
        // lower-case when accessed via express: 'x-provider-key', 'x-provider-url'.
        const apiKey = req.get('x-provider-key') || process.env.GEMINI_API_KEY;
        if (!apiKey) {
          return res.status(501).json(errorPayload('AI integration not configured. Provide GEMINI_API_KEY or send X-Provider-Key header'));
        }

        // Build Gemini URL from per-request header or environment variables
        const geminiUrl = req.get('x-provider-url') || process.env.GEMINI_API_URL || (process.env.GEMINI_PORT ? `http://localhost:${process.env.GEMINI_PORT}/v1/generate` : null);
        if (!geminiUrl) {
          return res.status(501).json(errorPayload('AI integration not configured. Provide GEMINI_API_URL, GEMINI_PORT or send X-Provider-URL header'));
        }

        try {
          // If the URL looks like Google's generative language endpoint and an API key is provided,
          // send the key as a query parameter (API keys are supported that way) and use the
          // expected request shape for the generate endpoint.
          let urlToCall = geminiUrl;
          const isGoogleGen = geminiUrl.includes('generativelanguage.googleapis.com');
          const headers = { 'Content-Type': 'application/json' };
          let bodyPayload = { prompt: q, max_output_tokens: 16 };

          if (isGoogleGen) {
            // append key param
            urlToCall = geminiUrl.includes('?') ? `${geminiUrl}&key=${apiKey}` : `${geminiUrl}?key=${apiKey}`;
            // use Google's prompt structure
            bodyPayload = { prompt: { text: q }, max_output_tokens: 16 };
          } else {
            // try Authorization Bearer for non-Google endpoints
            headers.Authorization = `Bearer ${apiKey}`;
          }

          const resp = await fetch(urlToCall, {
            method: 'POST',
            headers,
            body: JSON.stringify(bodyPayload)
          });

          if (!resp.ok) {
              // capture provider body for debugging (do not log API keys)
              const bodyText = await resp.text().catch(() => '<no body>');
              console.error('AI provider returned non-OK', resp.status, bodyText);
              return res.status(502).json(errorPayload(`AI provider returned status ${resp.status}: ${bodyText}`));
          }

          const json = await resp.json();
          let answer = null;

          if (typeof json === 'string') answer = json;
          else if (json?.candidates && Array.isArray(json.candidates) && json.candidates[0]) answer = json.candidates[0].content || json.candidates[0];
          else if (json?.output && typeof json.output === 'string') answer = json.output;
          else if (json?.choices && Array.isArray(json.choices) && json.choices[0]) answer = json.choices[0].text || json.choices[0].message?.content || json.choices[0];
          else if (json?.answer) answer = json.answer;
          else answer = json;

          // If answer is an object, try to extract likely text fields, otherwise stringify.
          if (typeof answer !== 'string') {
            if (answer?.text) answer = answer.text;
            else if (answer?.message?.content) answer = answer.message.content;
            else if (answer?.content?.text) answer = answer.content.text;
            else if (answer?.content && typeof answer.content === 'string') answer = answer.content;
            else answer = JSON.stringify(answer);
          }

          const final = answer.toString().trim();
          return res.status(200).json(successPayload(final));
        } catch (err) {
          console.error('AI request failed', err && err.message);
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

app.listen(PORT, () => {
  console.log(`BFHL API listening on port ${PORT}`);
});