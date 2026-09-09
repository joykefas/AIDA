import { Injectable } from '@nestjs/common';
import { TranscriptionProvider } from '../transcription.provider';

@Injectable()
export class MockTranscriptionProvider extends TranscriptionProvider {
  async transcribe(input: {
    fileBuffer: Buffer;
    mimeType: string;
  }): Promise<{ text: string }> {
    await Promise.resolve();
    const sizeKb = Math.max(1, Math.round(input.fileBuffer.byteLength / 1024));
    return {
      text: `[Mock transcript] This ${sizeKb}KB ${input.mimeType} recording has been transcribed. Replace AI_PROVIDER_MODE=live with a Groq API key to get a real transcript here.`,
    };
  }
}
