import OpenAI from "openai";

export interface ModelConfig {
  name: string;
  endpoint?: string;
  apiKey?: string;
  contextWindow?: number;
}

export class LocalLlmClient {
  private client: OpenAI;
  private targetModelName: string;
  private resolvedModelName: string | null = null;

  constructor(config: ModelConfig) {
    this.targetModelName = config.name || "qwen3.8:latest";
    this.client = new OpenAI({
      baseURL: config.endpoint || "http://localhost:11434/v1",
      apiKey: config.apiKey || "ollama",
      timeout: 900000, // 15 minutes for heavy local LLM inference
      maxRetries: 3,
    });
  }

  private async resolveModelName(): Promise<string> {
    if (this.resolvedModelName) {
      return this.resolvedModelName;
    }

    try {
      const modelsList = await this.client.models.list();
      const availableModels = modelsList.data.map((m) => m.id);

      if (availableModels.length === 0) {
        this.resolvedModelName = this.targetModelName;
        return this.resolvedModelName;
      }

      // 1. Direct exact match
      if (availableModels.includes(this.targetModelName)) {
        this.resolvedModelName = this.targetModelName;
        return this.resolvedModelName;
      }

      // 2. Normalized match (e.g. qwen-3.8 vs qwen3.8:latest vs qwen3.8)
      const targetClean = this.targetModelName.toLowerCase().replace(/[-_:\s]/g, "");
      const match = availableModels.find((m) => {
        const clean = m.toLowerCase().replace(/[-_:\s]/g, "");
        return clean.includes(targetClean) || targetClean.includes(clean);
      });

      if (match) {
        this.resolvedModelName = match;
        return this.resolvedModelName;
      }

      // 3. Fallback: Find any Qwen/Coder model, or first non-embedding model
      const qwenFallback = availableModels.find(
        (m) => m.toLowerCase().includes("qwen") && !m.toLowerCase().includes("embed")
      );
      if (qwenFallback) {
        this.resolvedModelName = qwenFallback;
        return this.resolvedModelName;
      }

      const nonEmbedFallback = availableModels.find((m) => !m.toLowerCase().includes("embed"));
      this.resolvedModelName = nonEmbedFallback || availableModels[0];
      return this.resolvedModelName;
    } catch {
      this.resolvedModelName = this.targetModelName;
      return this.resolvedModelName;
    }
  }

  async generateResponse(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools?: OpenAI.Chat.Completions.ChatCompletionTool[]
  ): Promise<OpenAI.Chat.Completions.ChatCompletionMessage> {
    const activeModel = await this.resolveModelName();

    const params: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      model: activeModel,
      messages,
      temperature: 0.1,
    };

    if (tools && tools.length > 0) {
      params.tools = tools;
      params.tool_choice = "auto";
    }

    const res = await this.client.chat.completions.create(params);
    return res.choices[0].message;
  }
}
