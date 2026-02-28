import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Increase limit for large base64 images
app.use(express.json({ limit: "20mb" }));

// API Route for Translation
app.post("/api/translate", async (req, res) => {
  const { image, targetLang } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server" });
  }

  if (!image) {
    return res.status(400).json({ error: "No image data provided" });
  }

  try {
    const genAI = new GoogleGenAI({ apiKey });
    const base64Content = image.includes(",") ? image.split(",")[1] : image;
    const mimeType = image.split(",")[0].split(":")[1]?.split(";")[0] || "image/jpeg";

    const prompt = `Detect all text blocks in this image. For each block, provide:
1. The original text ('text').
2. The translation of that text into ${targetLang || "Traditional Chinese"} ('translatedText').
3. Its bounding box coordinates ('box_2d' as [ymin, xmin, ymax, xmax], normalized to 0-1000).
4. Whether the text is written horizontally or vertically ('orientation': 'horizontal' or 'vertical').

Return the result as a JSON array of objects. Keep translations concise for image overlays.`;

    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Content,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              translatedText: { type: Type.STRING },
              orientation: { 
                type: Type.STRING,
                description: "The writing direction of the text: 'horizontal' or 'vertical'"
              },
              box_2d: { 
                type: Type.ARRAY,
                items: { type: Type.NUMBER }
              },
            },
            required: ["text", "translatedText", "orientation", "box_2d"],
          },
        },
      },
    });

    const rawBlocks = JSON.parse(response.text || "[]");
    const formattedBlocks = rawBlocks.map((b: any) => {
      const [ymin, xmin, ymax, xmax] = b.box_2d;
      return {
        text: b.text,
        translatedText: b.translatedText,
        orientation: b.orientation === "vertical" ? "vertical" : "horizontal",
        boundingBox: {
          vertices: [
            { x: xmin, y: ymin },
            { x: xmax, y: ymin },
            { x: xmax, y: ymax },
            { x: xmin, y: ymax },
          ]
        }
      };
    });

    res.json(formattedBlocks);
  } catch (error: any) {
    console.error("Server-side translation error:", error);
    res.status(500).json({ error: error.message || "Failed to process image" });
  }
});

// For Vercel, we don't call app.listen() here.
// Instead, we export the app.
export default app;
