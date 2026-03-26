import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface AppAnalysisResult {
  isWebWrapper: boolean;
  suggestedUrl: string | null;
  confidence: number;
  reasoning: string;
}

export async function analyzeAppMetadata(name: string, packageName: string): Promise<AppAnalysisResult> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this Android app metadata:
      Name: ${name}
      Package: ${packageName}
      
      Is this app likely a web-wrapper (WebView) for a specific website? 
      If yes, provide the most likely base URL for that website. 
      Return JSON with the following structure:
      {
        "isWebWrapper": boolean,
        "suggestedUrl": string | null,
        "confidence": number,
        "reasoning": string
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isWebWrapper: { type: Type.BOOLEAN },
            suggestedUrl: { type: Type.STRING, nullable: true },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          },
          required: ["isWebWrapper", "suggestedUrl", "confidence", "reasoning"]
        }
      }
    });

    const result = JSON.parse(response.text);
    return result;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return {
      isWebWrapper: false,
      suggestedUrl: null,
      confidence: 0,
      reasoning: "Analysis failed due to technical error."
    };
  }
}
