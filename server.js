// server.js
import 'dotenv/config';
import express from "express";
import cors from "cors";
import fs from "fs";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // ✅ stored in Render environment variable
});

// Load local JSON question banks
const subjects = ["physics", "chemistry", "math", "biology"];
const data = {};
for (let subj of subjects) {
  data[subj] = JSON.parse(fs.readFileSync(`./data/${subj}.json`, "utf8"));
}

// Serve question banks
for (let subj of subjects) {
  app.get(`/${subj}`, (req, res) => res.json(data[subj]));
}

// AI endpoint
app.post("/ask-ai", async (req, res) => {
  try {
    const question = req.body.question;
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert tutor in Physics, Chemistry, Math, and Biology." },
        { role: "user", content: `Solve this question in detailed steps:\n${question}` }
      ]
    });
    res.json({ answer: response.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI request failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
