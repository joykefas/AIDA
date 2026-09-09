import { Injectable, Logger } from '@nestjs/common';
import { TranscriptionProvider } from '../transcription.provider';

/**
 * Audio transcription provider:
 * 1. Primary: Groq Whisper API (whisper-large-v3-turbo)
 * 2. Backup: Cloudflare Workers AI (@cf/openai/whisper) with automatic runtime failover
 */
@Injectable()
export class LiveTranscriptionProvider extends TranscriptionProvider {
  private readonly logger = new Logger(LiveTranscriptionProvider.name);

  private readonly groqApiKey =
    process.env.GROQ_API_KEY ?? process.env.TRANSCRIPTION_API_KEY;
  private readonly groqModel =
    process.env.GROQ_WHISPER_MODEL ?? 'whisper-large-v3-turbo';

  private readonly cfAccountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ?? process.env.CF_ACCOUNT_ID;
  private readonly cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
  private readonly cfModel =
    process.env.CLOUDFLARE_WHISPER_MODEL ?? '@cf/openai/whisper';

  private readonly customUrl = process.env.TRANSCRIPTION_URL;

  async transcribe(input: {
    fileBuffer: Buffer;
    mimeType: string;
  }): Promise<{ text: string }> {
    // 1. Custom URL override if provided
    if (this.customUrl) {
      if (this.customUrl.includes('api.cloudflare.com')) {
        return this.transcribeCloudflare(input);
      }
      return this.transcribeGroq(input, this.customUrl);
    }

    // 2. Primary: Groq Whisper
    if (this.groqApiKey) {
      try {
        return await this.transcribeGroq(input);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Groq primary transcription failed: ${message}. Attempting failover to Cloudflare Workers AI backup...`,
        );
      }
    }

    // 3. Backup: Cloudflare Workers AI Whisper
    if (this.cfAccountId && this.cfApiToken) {
      try {
        return await this.transcribeCloudflare(input);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Cloudflare Workers AI backup transcription failed: ${message}`,
        );
        throw new Error(`All transcription providers failed: ${message}`);
      }
    }

    throw new Error(
      'Transcription credentials not configured. Please set GROQ_API_KEY (primary) and/or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN (backup).',
    );
  }

  private async transcribeGroq(
    input: { fileBuffer: Buffer; mimeType: string },
    overrideUrl?: string,
  ): Promise<{ text: string }> {
    const url =
      overrideUrl ?? 'https://api.groq.com/openai/v1/audio/transcriptions';

    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(input.fileBuffer)], { type: input.mimeType }),
      'audio',
    );
    form.append('model', this.groqModel);

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.groqApiKey}` },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      text?: string;
      result?: { text?: string };
    };
    return { text: data.text ?? data.result?.text ?? '' };
  }

  private async transcribeCloudflare(input: {
    fileBuffer: Buffer;
    mimeType: string;
  }): Promise<{ text: string }> {
    const url =
      this.customUrl ??
      `https://api.cloudflare.com/client/v4/accounts/${this.cfAccountId}/ai/run/${this.cfModel}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.cfApiToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(input.fileBuffer),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      result?: { text?: string };
      text?: string;
      success?: boolean;
    };

    const text = data.result?.text ?? data.text ?? '';
    return { text };
  }
}
