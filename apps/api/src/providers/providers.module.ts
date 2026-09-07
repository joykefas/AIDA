import { Global, Module } from '@nestjs/common';
import { LlmProvider } from './llm.provider';
import { TranscriptionProvider } from './transcription.provider';
import { EmailProvider } from './email.provider';
import { StorageProvider } from './storage.provider';
import { MockLlmProvider } from './mock/mock-llm.provider';
import { MockTranscriptionProvider } from './mock/mock-transcription.provider';
import { MockEmailProvider } from './mock/mock-email.provider';
import { LiveLlmProvider } from './live/live-llm.provider';
import { LiveTranscriptionProvider } from './live/live-transcription.provider';
import { LiveEmailProvider } from './live/live-email.provider';
import { EmbeddingProvider } from './embedding.provider';
import { MockEmbeddingProvider } from './mock/mock-embedding.provider';
import { LiveEmbeddingProvider } from './live/live-embedding.provider';

const aiIsLive = process.env.AI_PROVIDER_MODE === 'live';
const emailIsLive = process.env.EMAIL_PROVIDER_MODE === 'live';

@Global()
@Module({
  providers: [
    StorageProvider,
    {
      provide: LlmProvider,
      useClass: aiIsLive ? LiveLlmProvider : MockLlmProvider,
    },
    {
      provide: TranscriptionProvider,
      useClass: aiIsLive
        ? LiveTranscriptionProvider
        : MockTranscriptionProvider,
    },
    {
      provide: EmbeddingProvider,
      useClass: aiIsLive ? LiveEmbeddingProvider : MockEmbeddingProvider,
    },
    {
      provide: EmailProvider,
      useClass: emailIsLive ? LiveEmailProvider : MockEmailProvider,
    },
  ],
  exports: [
    LlmProvider,
    TranscriptionProvider,
    EmbeddingProvider,
    EmailProvider,
    StorageProvider,
  ],
})
export class ProvidersModule {}
