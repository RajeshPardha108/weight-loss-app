import { AIProvider, AIProviderRequest, AIProviderResponse } from '../types';

export class OllamaProvider implements AIProvider {
  private baseUrl: string;
  private model: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3';
  }

  async generate(request: AIProviderRequest): Promise<AIProviderResponse> {
    const url = `${this.baseUrl}/api/generate`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          system: request.systemPrompt,
          prompt: request.userPrompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || typeof data.response !== 'string') {
        throw new Error('Invalid JSON response from Ollama');
      }

      return {
        content: data.response,
        model: data.model || this.model,
        usage: {
          promptTokens: data.prompt_eval_count || 0,
          completionTokens: data.eval_count || 0,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        }
      };
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Network error connecting to Ollama at ${this.baseUrl}: ${error.message}`);
      }
      throw error;
    }
  }
}
