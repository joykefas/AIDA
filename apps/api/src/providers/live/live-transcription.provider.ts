import { Injectable, Logger } from '@nestjs/common';
import { TranscriptionProvider } from '../transcription.provider';

/**
 * Audio transcription provider supporting:
 * 1. Cloudflare Workers AI (@cf/openai/whisper or @cf/openai/whisper-large-v3-turbo)
 * 2. OpenAI-compatible /audio/transcriptions endpoints (Groq, custom proxies, etc.)
 */
@Injectable()
export class LiveTranscriptionProvider extends TranscriptionProvider {
  private readonly logger = new Logger(LiveTranscriptionProvider.name);
  private readonly cfAccountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ?? process.env.CF_ACCOUNT_ID;
  private readonly apiKey =
    process.env.TRANSCRIPTION_API_KEY ??
    process.env.CLOUDFLARE_API_TOKEN ??
    process.env.LLM_API_KEY ??
    process.env.GROQ_API_KEY;
  private readonly model =
    process.env.TRANSCRIPTION_MODEL ??
    (this.cfAccountId
      ? '@cf/openai/whisper'
      : (process.env.GROQ_WHISPER_MODEL ?? 'whisper-large-v3-turbo'));
  private readonly customUrl = process.env.TRANSCRIPTION_URL;

  async transcribe(input: {
    fileBuffer: Buffer;
    mimeType: string;
  }): Promise<{ text: string }> {
    if (!this.apiKey) {
      throw new Error(
        'Transcription credentials not configured (set CLOUDFLARE_API_TOKEN or TRANSCRIPTION_API_KEY)',
      );
    }

    const isCloudflare =
      Boolean(this.cfAccountId) ||
      (this.customUrl && this.customUrl.includes('api.cloudflare.com'));

    if (isCloudflare) {
      return this.transcribeCloudflare(input);
    }

    return this.transcribeOpenAICompatible(input);
  }

  private async transcribeCloudflare(input: {
    fileBuffer: Buffer;
    mimeType: string;
  }): Promise<{ text: string }> {
    const url =
      this.customUrl ??
      `https://api.cloudflare.com/client/v4/accounts/${this.cfAccountId}/ai/run/${this.model}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(input.fileBuffer),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(
        `Cloudflare transcription failed: ${res.status} ${body}`,
      );
      throw new Error(`Transcription provider error: ${res.status}`);
    }

    const data = (await res.json()) as {
      result?: { text?: string };
      text?: string;
      success?: boolean;
    };

    const text = data.result?.text ?? data.text ?? '';
    return { text };
  }

  private async transcribeOpenAICompatible(input: {
    fileBuffer: Buffer;
    mimeType: string;
  }): Promise<{ text: string }> {
    const url =
      this.customUrl ?? 'https://api.groq.com/openai/v1/audio/transcriptions';

    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(input.fileBuffer)], { type: input.mimeType }),
      'audio',
    );
    form.append('model', this.model);

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Transcription failed: ${res.status} ${body}`);
      throw new Error(`Transcription provider error: ${res.status}`);
    }

    const data = (await res.json()) as {
      text?: string;
      result?: { text?: string };
    };
    return { text: data.text ?? data.result?.text ?? '' };
  }
}
