import express from "express";
import path from "path";
import * as cheerio from "cheerio";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Nạp biến môi trường từ .env.local và .env cho Express server
dotenv.config({ path: ".env.local" });
dotenv.config();

// Initialize Gemini
let ai: GoogleGenAI | null = null;
const initGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!ai && apiKey && apiKey !== "MY_GEMINI_API_KEY") {
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

const app = express();
app.use(express.json());

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Proxy Codeforces API to avoid any potential CORS issues
app.get("/api/cf/user.status", async (req, res) => {
  try {
    const { handle } = req.query;
    if (!handle) return res.status(400).json({ error: "Handle is required" });
    const response = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/cf/problemset.problems", async (req, res) => {
  try {
    const response = await fetch("https://codeforces.com/api/problemset.problems");
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Scrape and Translate Problem Statement
app.post("/api/problem/translate", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    // Use mirror to avoid Cloudflare block
    const fetchUrl = url.replace("codeforces.com", "mirror.codeforces.com");

    const response = await fetch(fetchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    let statement = $(".problem-statement");
    
    if (!statement.length) {
       console.error("Failed to extract HTML. Snippet:", html.substring(0, 500));
       return res.status(404).json({ error: "Could not extract problem statement. Response snippet: " + html.substring(0, 200) });
    }

    // Fix relative URLs
    statement.find('img').each((i, el) => {
      const src = $(el).attr('src');
      if (src && src.startsWith('/')) {
        $(el).attr('src', 'https://codeforces.com' + src);
      }
    });

    const timeLimit = statement.find(".header .time-limit").contents().filter(function() { return this.nodeType === 3; }).text().trim();
    const memoryLimit = statement.find(".header .memory-limit").contents().filter(function() { return this.nodeType === 3; }).text().trim();

    const bodyHtml = statement.children('div').eq(1).html() || '';
    
    const inputSpecHtml = statement.find(".input-specification").clone().children(".section-title").remove().end().html() || '';
    const outputSpecHtml = statement.find(".output-specification").clone().children(".section-title").remove().end().html() || '';
    const noteHtml = statement.find(".note").clone().children(".section-title").remove().end().html() || '';

    const samples: { input: string, output: string }[] = [];
    statement.find('.sample-test .input').each((i, el) => {
      samples.push({
        input: $(el).find('pre').html() || '',
        output: statement.find('.sample-test .output').eq(i).find('pre').html() || ''
      });
    });

    const originalStructured = {
      timeLimit,
      memoryLimit,
      body: bodyHtml,
      inputSpec: inputSpecHtml,
      outputSpec: outputSpecHtml,
      samples,
      note: noteHtml
    };

    const genAI = initGenAI();
    if (!genAI) {
      return res.json({
        original: originalStructured,
        translated: {
          ...originalStructured,
          body: `<p><em>Đây là bản dịch mẫu (Mock API do thiếu cấu hình Gemini API Key). Để có bản dịch thật, vui lòng thêm API Key trong mục Settings của AI Studio.</em></p><br/>` + originalStructured.body,
          inputSpec: `<p><em>(Mẫu dữ liệu vào) </em>` + originalStructured.inputSpec + `</p>`,
          outputSpec: `<p><em>(Mẫu dữ liệu ra) </em>` + originalStructured.outputSpec + `</p>`,
          note: originalStructured.note ? `<p><em>(Mẫu giải thích) </em>` + originalStructured.note + `</p>` : ""
        },
        message: "Gemini API key not configured. Using mock translation."
      });
    }

    const prompt = `Translate the following Codeforces problem sections from English to Vietnamese. 
Preserve all HTML tags and MathJax ($$$ formula $$$) exactly as they are.
CRITICAL: Do NOT add newlines or block tags (like <div> or <p>) around inline MathJax ($$$...$$$). You must keep the formulas inline within the text.
IMPORTANT: Escape all backslashes in MathJax as double backslashes (\\\\) so the output is valid JSON.
Respond ONLY with a valid JSON object matching the exact keys: "body", "inputSpec", "outputSpec", "note".
Do NOT include markdown formatting (\`\`\`json).

Text to translate:
{
  "body": ${JSON.stringify(bodyHtml)},
  "inputSpec": ${JSON.stringify(inputSpecHtml)},
  "outputSpec": ${JSON.stringify(outputSpecHtml)},
  "note": ${JSON.stringify(noteHtml)}
}`;

    const aiResponse = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    let responseText = aiResponse.text || "{}";
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      responseText = responseText.substring(jsonStart, jsonEnd + 1);
    }
    
    let translatedData = null;
    try {
      translatedData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", responseText);
      // Thử tự động sửa lỗi thiếu escape backslash (rất hay gặp với LaTeX)
      try {
        const fixedText = responseText.replace(/\\(?!["\\/bfnrt])/g, "\\\\");
        translatedData = JSON.parse(fixedText);
      } catch (e2) {
        console.error("Vẫn lỗi sau khi auto-fix JSON:", e2);
      }
    }

    res.json({ 
      original: originalStructured,
      translated: translatedData ? {
        ...originalStructured,
        body: translatedData.body || originalStructured.body,
        inputSpec: translatedData.inputSpec || originalStructured.inputSpec,
        outputSpec: translatedData.outputSpec || originalStructured.outputSpec,
        note: translatedData.note || originalStructured.note
      } : null
    });

  } catch (error: any) {
    console.error(error);
    const errorMessage = error.message || String(error);
    if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
      return res.status(500).json({ error: "Gemini API Key không hợp lệ. Vui lòng kiểm tra lại API key." });
    }
    res.status(500).json({ error: errorMessage });
  }
});

// Setup Vite/Static Serving only if running locally (not Vercel)
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const setupViteAndListen = async () => {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  };
  setupViteAndListen();
} else if (!process.env.VERCEL) {
  // Production fallback if not Vercel
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
