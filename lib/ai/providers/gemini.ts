import { AIProvider, AIProviderRequest, AIProviderResponse } from '../types';

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    this.apiKey = key;
    this.model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }

  async generate(request: AIProviderRequest): Promise<AIProviderResponse> {
    const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;
    
    // Construct Gemini API payload
    const payload: any = {
      system_instruction: {
        parts: [{ text: request.systemPrompt }]
      },
      contents: [{
        parts: [{ text: request.userPrompt }]
      }],
      generationConfig: {}
    };

    if (request.responseFormat === 'json') {
      payload.generationConfig.response_mime_type = "application/json";
      if (request.responseSchema) {
        payload.generationConfig.response_schema = request.responseSchema;
      }
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorBody = '';
        try {
          const errData = await response.json();
          errorBody = JSON.stringify(errData);
        } catch(e) {
          errorBody = await response.text();
        }
        throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const data = await response.json();

      if (!data || !data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
        throw new Error('Invalid or empty response from Gemini');
      }

      const content = data.candidates[0].content.parts[0].text;
      
      let promptTokens = 0;
      let completionTokens = 0;
      let totalTokens = 0;
      
      if (data.usageMetadata) {
        promptTokens = data.usageMetadata.promptTokenCount || 0;
        completionTokens = data.usageMetadata.candidatesTokenCount || 0;
        totalTokens = data.usageMetadata.totalTokenCount || 0;
      }

      return {
        content,
        model: this.model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        }
      };
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Network error connecting to Gemini: ${error.message}`);
      }
      throw error;
    }
  }
}
