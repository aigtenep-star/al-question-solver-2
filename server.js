// server.js
import 'dotenv/config';
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const PORT = process.env.PORT || 3000;

// Ensure API key exists
if (!process.env.OPENAI_API_KEY) {
  console.error("ERROR: OPENAI_API_KEY is not set. Set it in your environment (Render) or .env (local).");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(cors()); // optionally restrict origin in production
app.use(express.json());

// Load local JSON question banks (with error handling)
const subjects = ["physics", "chemistry", "math", "biology"];
const data = {};

for (const subj of subjects) {
  try {
    const filePath = path.resolve(`./data/${subj}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      data[subj] = JSON.parse(raw);
      console.log(`Loaded ${subj} (${Array.isArray(data[subj]) ? data[subj].length : "unknown"} entries)`);
    } else {
      console.warn(`Warning: ./data/${subj}.json not found — ${subj} endpoint will return 404.`);
      data[subj] = null;
    }
  } catch (err) {
    console.error(`Failed to load ./data/${subj}.json:`, err.message);
    data[subj] = null;
  }
}

// Serve question banks
for (const subj of subjects) {
  app.get(`/${subj}`, (req, res) => {
    if (!data[subj]) return res.status(404).json({ error: `${subj} data not found` });
    res.json(data[subj]);
  });
}

// AI endpoint
app.post("/ask-ai", async (req, res) => {
  try {
    const question = (req.body?.question || "").toString().trim();
    if (!question) return res.status(400).json({ error: "No question provided in request body." });

    // Use chat completions; adapt parameters as needed
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert tutor in Physics, Chemistry, Math, and Biology. Provide clear step-by-step solutions." },
        { role: "user", content: `Solve this question in detailed steps:\n${question}` }
      ],
      max_tokens: 1200,
    });

    // Safely extract message content
    const assistantMessage =
      response?.choices?.[0]?.message?.content ??
      response?.choices?.[0]?.text ??
      null;

    if (!assistantMessage) {
      console.error("OpenAI returned an unexpected response:", JSON.stringify(response));
      return res.status(500).json({ error: "AI returned empty response" });
    }

    res.json({ answer: assistantMessage });
  } catch (err) {
    console.error("AI request failed:", err?.message ?? err);
    res.status(500).json({ error: "AI request failed" });
  }
});

// Optional health-check
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
