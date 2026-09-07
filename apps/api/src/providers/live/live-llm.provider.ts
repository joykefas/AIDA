import { Injectable, Logger } from '@nestjs/common';
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
 * Calls an OpenAI-compatible chat/completions endpoint (Cloudflare Workers AI,
 * Groq, Fireworks AI, or Together AI, per LLM_BASE_URL or CLOUDFLARE_ACCOUNT_ID).
 * Flash handles high-volume generation (notes/quiz); Pro is reserved for the
 * tutor and grading, where answer quality matters most.
 */
@Injectable()
export class LiveLlmProvider extends LlmProvider {
  private readonly logger = new Logger(LiveLlmProvider.name);
  private readonly cfAccountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ?? process.env.CF_ACCOUNT_ID;
  private readonly baseUrl =
    process.env.LLM_BASE_URL ||
    (this.cfAccountId
      ? `https://api.cloudflare.com/client/v4/accounts/${this.cfAccountId}/ai/v1`
      : undefined);
  private readonly apiKey =
    process.env.LLM_API_KEY || process.env.CLOUDFLARE_API_TOKEN;
  private readonly flashModel =
    process.env.LLM_MODEL_FLASH ??
    (this.cfAccountId
      ? '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
      : 'llama-3.3-70b-versatile');
  private readonly proModel =
    process.env.LLM_MODEL_PRO ??
    (this.cfAccountId
      ? '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
      : 'llama-3.3-70b-versatile');

  private async chatComplete(
    model: string,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error(
        'LLM credentials not configured (set LLM_BASE_URL & LLM_API_KEY or CLOUDFLARE_ACCOUNT_ID & CLOUDFLARE_API_TOKEN)',
      );
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`LLM call failed: ${res.status} ${body}`);
      throw new Error(`LLM provider error: ${res.status}`);
    }
    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0].message.content;
  }

  async generateContent(input: {
    title: string;
    rawText: string;
  }): Promise<GeneratedContent> {
    const system =
      'You generate study notes as JSON: {summary, notes:[{heading,anchor,bullets}], mindMap:{nodes:[{id,label,noteAnchor}],edges:[{source,target}]}, quizQuestions:[{type,prompt,options,correctAnswer}]}.';
    const content = await this.chatComplete(
      this.flashModel,
      system,
      `Title: ${input.title}\n\nMaterial:\n${input.rawText}`,
    );
    const cleaned = stripMarkdownCodeFence(content);
    return JSON.parse(cleaned) as GeneratedContent;
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
      this.proModel,
      `${system} ${styleNote} ${simplifyNote}`,
      `Context:\n${context}\n\nQuestion: ${input.question}`,
    );
    return { answer };
  }

  async gradeWrittenResponse(
    input: GradeWrittenInput,
  ): Promise<GradeWrittenOutput> {
    const system =
      'Grade the student answer against the prompt and reference answer. Respond as JSON: {"score": 0-1, "feedback": "specific, qualitative feedback"}.';
    const content = await this.chatComplete(
      this.proModel,
      system,
      `Prompt: ${input.prompt}\nReference answer: ${input.correctAnswer ?? '(none provided)'}\nStudent answer: ${input.studentAnswer}`,
    );
    const cleaned = stripMarkdownCodeFence(content);
    return JSON.parse(cleaned) as GradeWrittenOutput;
  }
}
