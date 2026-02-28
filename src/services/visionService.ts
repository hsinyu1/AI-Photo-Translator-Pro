import { GoogleGenAI, Type } from "@google/genai";

export interface BoundingBox {
  vertices: { x: number; y: number }[];
}

export interface TextBlock {
  text: string;
  boundingBox: BoundingBox;
}

export interface TranslatedBlock extends TextBlock {
  translatedText: string;
  orientation: "horizontal" | "vertical";
}

export async function performOCRAndTranslate(
  base64Image: string,
  targetLang: string = "Traditional Chinese"
): Promise<TranslatedBlock[]> {
  // Check for user-provided key in localStorage
  const savedKey = localStorage.getItem("user_gemini_api_key");
  const apiKey = savedKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("請先設定 Gemini API Key (點擊右上角設定圖示)");
  }

  const genAI = new GoogleGenAI({ apiKey });
  const base64Content = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
  const mimeType = base64Image.split(",")[0].split(":")[1]?.split(";")[0] || "image/jpeg";

  const prompt = `Detect all text blocks in this image. For each block, provide:
1. The original text ('text').
2. The translation of that text into ${targetLang} ('translatedText').
3. Its bounding box coordinates ('box_2d' as [ymin, xmin, ymax, xmax], normalized to 0-1000).
4. Whether the text is written horizontally or vertically ('orientation': 'horizontal' or 'vertical').

Return the result as a JSON array of objects. Keep translations concise for image overlays.`;

  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: base64Content } }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            translatedText: { type: Type.STRING },
            orientation: { type: Type.STRING },
            box_2d: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          },
          required: ["text", "translatedText", "orientation", "box_2d"],
        },
      },
    },
  });

  const rawBlocks = JSON.parse(response.text || "[]");
  return rawBlocks.map((b: any) => {
    const [ymin, xmin, ymax, xmax] = b.box_2d;
    return {
      text: b.text,
      translatedText: b.translatedText,
      orientation: b.orientation === "vertical" ? "vertical" : "horizontal",
      boundingBox: {
        vertices: [{ x: xmin, y: ymin }, { x: xmax, y: ymin }, { x: xmax, y: ymax }, { x: xmin, y: ymax }]
      }
    };
  });
}
