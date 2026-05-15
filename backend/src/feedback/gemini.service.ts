import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService {
  private ai: GoogleGenAI;

  constructor(private config: ConfigService) {
    this.ai = new GoogleGenAI({ apiKey: this.config.get<string>('GEMINI_API_KEY') ?? '' });
  }

  async generateFeedback(contextSnapshot: object): Promise<string> {
    const prompt = `You are a personal fitness coach. Analyze the following workout data from the past 14 days and provide specific, actionable coaching feedback.

Data:
${JSON.stringify(contextSnapshot, null, 2)}

Evaluate:
1. Muscle group coverage and balance across gym sessions
2. Barbell weight and rep progression per exercise (is the user progressing?)
3. Kickboxing round quality trends (average quality_rating per round type)
4. Rest and recovery patterns
5. Top 2-3 specific areas to improve

Keep feedback encouraging but honest. Be specific about numbers where possible.`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text ?? '';
  }
}
