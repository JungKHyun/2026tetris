
import { GoogleGenAI, Type } from "@google/genai";
import { AiCommentary } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getAiFeedback = async (
  board: string[][], 
  score: number, 
  nextPiece: string
): Promise<AiCommentary> => {
  try {
    // 보드 상태 요약 (가독성을 위해 간단하게 변환)
    const boardSummary = board.map(row => 
      row.map(cell => (cell === 'empty' ? '.' : 'X')).join('')
    ).slice(-10).join('\n'); // 하단 10줄만 전달

    const prompt = `
      너는 세계 최고의 테트리스 코치 'Gemini'야. 
      현재 플레이어의 보드 하단 10줄 상태는 다음과 같아 (.은 빈칸, X는 블록):
      ${boardSummary}
      
      현재 점수: ${score}
      다음 나올 블록: ${nextPiece}

      플레이어에게 짧고 강력한 한마디 조언이나 칭찬, 혹은 위기 경고를 한국어로 해줘.
      반드시 JSON 형식으로 응답해.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING, description: "코치의 메시지" },
            sentiment: { 
              type: Type.STRING, 
              enum: ["positive", "neutral", "negative", "advice"],
              description: "메시지의 분위기"
            }
          },
          required: ["message", "sentiment"]
        }
      }
    });

    return JSON.parse(response.text) as AiCommentary;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      message: "통신 오류가 발생했지만, 계속 집중하세요! 당신의 감각을 믿으세요.",
      sentiment: "neutral"
    };
  }
};
