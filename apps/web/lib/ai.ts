const DEEPSEEK_BASE = "https://api.deepseek.com/v1";
const MODEL = "deepseek-chat";

interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepSeekResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
}

export class AIClientError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryable = false,
  ) {
    super(message);
    this.name = "AIClientError";
  }
}

export async function callDeepSeek(
  prompt: string,
  system?: string,
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new AIClientError("DEEPSEEK_API_KEY not configured", 500);

  const messages: DeepSeekMessage[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4000,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    throw new AIClientError(
      `DeepSeek API error (${res.status}): ${text.slice(0, 200)}`,
      res.status,
      res.status === 429 || res.status >= 500,
    );
  }

  const data = (await res.json()) as DeepSeekResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AIClientError("Empty AI response");

  return content;
}

export async function callDeepSeekJSON<T>(
  prompt: string,
  system?: string,
  options?: { temperature?: number; maxTokens?: number },
): Promise<T> {
  const raw = await callDeepSeek(prompt, system, {
    ...options,
    temperature: options?.temperature ?? 0.3,
  });

  // Extract JSON from markdown code blocks (handles text before/after)
  let cleaned = raw;
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlock) {
    cleaned = codeBlock[1].trim();
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Last resort: try to find JSON object in the text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]) as T; } catch { /* fall through */ }
    }
    throw new AIClientError(
      `AI returned invalid JSON: ${cleaned.slice(0, 300)}`,
    );
  }
}
