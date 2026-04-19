import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import * as path from 'path';
import 'dotenv/config';

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use(express.json());

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // API Routes
  app.post("/api/generate-image", async (req, res) => {
    try {
      const { prompt, size } = req.body;
      let imgSize = "1K";
      if (size === "1K" || size === "2K" || size === "4K" || size === "512px") {
        imgSize = size;
      }
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
             aspectRatio: "1:1",
             imageSize: imgSize
          }
        } as any,
      });

      let imageUrl;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/jpeg;base64,${part.inlineData.data}`;
        }
      }
      
      res.json({ imageUrl });
    } catch (error: any) {
      console.error('Image Gen Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      const historyMsg = messages.map((m: any) => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: historyMsg,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        }
      });
      
      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Chat Gen Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
