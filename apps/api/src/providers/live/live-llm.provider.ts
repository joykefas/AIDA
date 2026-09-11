import { Injectable, Logger } from '@nestjs/common';
import { LearningStyle } from '@aida/shared';
import {
  LlmProvider,
  GeneratedContent,
  TutorAnswerInput,
  TutorAnswerOutput,
  GradeWrittenInput,
  GradeWrittenOutput,
} from '../llm.provider';

function stripMarkdownCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

/**
 * Primary: Groq API (llama-3.3-70b-versatile).
 * Backup: Cloudflare Workers AI (@cf/meta/llama-3.3-70b-instruct-fp8-fast) with automatic runtime failover.
 */
@Injectable()
export class LiveLlmProvider extends LlmProvider {
  private readonly logger = new Logger(LiveLlmProvider.name);

  private readonly groqApiKey =
    process.env.GROQ_API_KEY ?? process.env.LLM_API_KEY;
  private readonly groqModel =
    process.env.GROQ_LLM_MODEL ?? 'llama-3.3-70b-versatile';

  private readonly cfAccountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ?? process.env.CF_ACCOUNT_ID;
  private readonly cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
  private readonly cfModel =
    process.env.CLOUDFLARE_LLM_MODEL ??
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

  private readonly customBaseUrl = process.env.LLM_BASE_URL;

  private async callEndpoint(
    url: string,
    apiKey: string,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    isJson: boolean,
  ): Promise<string> {
    const payload: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 8192,
    };

    if (isJson) {
      payload.response_format = { type: 'json_object' };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Malformed response from LLM endpoint');
    }
    return data.choices[0].message.content;
  }

  private async chatComplete(
    systemPrompt: string,
    userPrompt: string,
    isJson = false,
  ): Promise<string> {
    // 1. If explicit custom base URL is configured, route there directly
    if (this.customBaseUrl && this.groqApiKey) {
      return this.callEndpoint(
        `${this.customBaseUrl}/chat/completions`,
        this.groqApiKey,
        this.groqModel,
        systemPrompt,
        userPrompt,
        isJson,
      );
    }

    // 2. Primary provider: Groq API
    if (this.groqApiKey) {
      try {
        return await this.callEndpoint(
          'https://api.groq.com/openai/v1/chat/completions',
          this.groqApiKey,
          this.groqModel,
          systemPrompt,
          userPrompt,
          isJson,
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Groq primary LLM request failed: ${message}. Attempting failover to Cloudflare Workers AI backup...`,
        );
      }
    }

    // 3. Backup provider: Cloudflare Workers AI
    if (this.cfAccountId && this.cfApiToken) {
      try {
        const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${this.cfAccountId}/ai/v1/chat/completions`;
        return await this.callEndpoint(
          cfUrl,
          this.cfApiToken,
          this.cfModel,
          systemPrompt,
          userPrompt,
          isJson,
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Cloudflare Workers AI backup LLM failed: ${message}`,
        );
        throw new Error(`All LLM providers failed: ${message}`);
      }
    }

    throw new Error(
      'LLM credentials not configured. Please set GROQ_API_KEY (primary) and/or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (backup).',
    );
  }

  async generateContent(input: {
    title: string;
    rawText: string;
    learningStyle?: LearningStyle | null;
  }): Promise<GeneratedContent> {
    const stylePrompt = input.learningStyle
      ? ` Explain in a style suited to: ${input.learningStyle}.`
      : '';
    const system =
      `You generate study notes as JSON with this shape: ` +
      `{"topics":[{"title":"...","summary":"...","notes":[{"heading":"...","anchor":"...","bullets":["..."]}],` +
      `"mindMap":{"nodes":[{"id":"...","label":"...","noteAnchor":"..."}],"edges":[{"source":"...","target":"..."}]},` +
      `"quizQuestions":[{"type":"MCQ|WRITTEN","prompt":"...","options":[{"id":"a","text":"..."}],"correctAnswer":"..."}]}]}.` +
      ` Identify 1-5 logical topics/sections from the material and generate separate notes for each.${stylePrompt}`;
    const content = await this.chatComplete(
      system,
      `Title: ${input.title}\n\nMaterial:\n${input.rawText}`,
      true,
    );
    const cleaned = stripMarkdownCodeFence(content);
    const parsed = JSON.parse(cleaned) as GeneratedContent;
    // Normalise: if model returned legacy flat shape, promote it into topics array
    if (!parsed.topics && parsed.summary) {
      parsed.topics = [
        {
          title: input.title,
          summary: parsed.summary,
          notes: parsed.notes ?? [],
          mindMap: parsed.mindMap ?? { nodes: [], edges: [] },
          quizQuestions: parsed.quizQuestions ?? [],
        },
      ];
    }
    return parsed;
  }

  async answerTutorQuestion(
    input: TutorAnswerInput,
  ): Promise<TutorAnswerOutput> {
    const system =
      "You are a study tutor. Answer strictly grounded in the provided context chunks from the student's own material. If the answer isn't in the context, say so rather than guessing.";
    const context = input.contextChunks
      .map((c) => `[${c.topicTitle} / ${c.noteAnchor}] ${c.text}`)
      .join('\n\n');
    const styleNote = input.learningStyle
      ? `Explain in a style suited to: ${input.learningStyle}.`
      : '';
    const simplifyNote = input.simplify
      ? 'Simplify further than a typical explanation.'
      : '';
    const answer = await this.chatComplete(
      `${system} ${styleNote} ${simplifyNote}`,
      `Context:\n${context}\n\nQuestion: ${input.question}`,
      false,
    );
    return { answer };
  }

  async gradeWrittenResponse(
    input: GradeWrittenInput,
  ): Promise<GradeWrittenOutput> {
    const styleNote = input.learningStyle
      ? ` Phrase all qualitative feedback to match the student's learning style preference: ${input.learningStyle} (e.g. use diagrams/analogies/stories/formulas/audio-style language as appropriate).`
      : '';
    const system = `Grade the student answer against the prompt and reference answer. Respond as JSON: {"score": 0-1, "feedback": "specific, qualitative feedback"}.${styleNote}`;
    const content = await this.chatComplete(
      system,
      `Prompt: ${input.prompt}\nReference answer: ${input.correctAnswer ?? '(none provided)'}\nStudent answer: ${input.studentAnswer}`,
      true,
    );
    const cleaned = stripMarkdownCodeFence(content);
    return JSON.parse(cleaned) as GradeWrittenOutput;
  }
}
