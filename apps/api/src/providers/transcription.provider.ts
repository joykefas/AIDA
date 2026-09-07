/**
 * DI token + contract for speech-to-text. Mock returns deterministic canned
 * text; live implementation calls Groq-hosted Whisper-Large-v3-Turbo.
 */
export abstract class TranscriptionProvider {
  abstract transcribe(input: {
    fileBuffer: Buffer;
    mimeType: string;
  }): Promise<{ text: string }>;
}
