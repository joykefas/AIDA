import { Injectable } from '@nestjs/common';
import { LearningStyle } from '@aida/shared';
import {
  LlmProvider,
  GeneratedContent,
  TutorAnswerInput,
  TutorAnswerOutput,
  GradeWrittenInput,
  GradeWrittenOutput,
} from '../llm.provider';

/** Deterministic string hash so mock output is stable across calls (useful for demos/tests). */
function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function splitIntoChunks(text: string, target: number): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length === 0) return [];
  const chunkSize = Math.max(1, Math.ceil(sentences.length / target));
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += chunkSize) {
    chunks.push(sentences.slice(i, i + chunkSize).join(' '));
  }
  return chunks.slice(0, target);
}

/** A short, content-derived heading instead of a generic "Section N" label,
 * so notes/mind map/summary read like they're actually about the material. */
function deriveHeading(chunk: string, index: number): string {
  const firstSentence = chunk.split(/(?<=[.!?])\s+/)[0]?.trim() ?? '';
  const words = firstSentence
    .replace(/[.!?]+$/, '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return `Section ${index + 1}`;
  const short = words.slice(0, 6).join(' ');
  const heading = words.length > 6 ? `${short}…` : short;
  return heading.charAt(0).toUpperCase() + heading.slice(1);
}

/** Truncates at the nearest word boundary within the limit instead of a raw
 * character slice, so quoted context never cuts off mid-word. */
function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Deterministic (seeded by the prompt, so repeat calls stay stable) Fisher-Yates
 * shuffle — without this, the real answer always landed in option "a". */
function shuffleOptions(
  correctText: string,
  distractors: string[],
  seed: string,
): { options: { id: string; text: string }[]; correctAnswer: string } {
  const all = [correctText, ...distractors];
  // Re-hashing "seed:i" per step (rather than chaining one LCG's state)
  // avoids the poor low-bit mixing that made a chained LCG's `% small
  // number` output land on the same slot almost every time.
  for (let i = all.length - 1; i > 0; i--) {
    const j = hash(`${seed}:${i}`) % (i + 1);
    [all[i], all[j]] = [all[j], all[i]];
  }
  const ids = ['a', 'b', 'c', 'd'];
  return {
    options: all.map((text, i) => ({ id: ids[i], text })),
    correctAnswer: ids[all.indexOf(correctText)],
  };
}

const STYLE_OPENER: Record<LearningStyle, string> = {
  [LearningStyle.DIAGRAMS]: 'Picture it laid out as a diagram:',
  [LearningStyle.STORIES]: 'Think of it like this story:',
  [LearningStyle.ANALOGIES]: "Here's an analogy that maps onto it:",
  [LearningStyle.FORMULAS]: 'In the most compact, formal terms:',
  [LearningStyle.AUDIO]: "Here's how I'd explain it out loud:",
};

@Injectable()
export class MockLlmProvider extends LlmProvider {
  async generateContent(input: {
    title: string;
    rawText: string;
    learningStyle?: LearningStyle | null;
  }): Promise<GeneratedContent> {
    await Promise.resolve();
    const sectionCount = Math.min(
      5,
      Math.max(3, Math.ceil(input.rawText.length / 400)),
    );
    const chunks = splitIntoChunks(input.rawText || input.title, sectionCount);
    const filledChunks =
      chunks.length > 0 ? chunks : [`Key ideas from "${input.title}".`];

    const notes = filledChunks.map((chunk, i) => ({
      heading: deriveHeading(chunk, i),
      anchor: `section-${i + 1}`,
      bullets: splitIntoChunks(chunk, 3).map((s) => s),
    }));

    const mindMap = {
      nodes: [
        { id: 'root', label: input.title, noteAnchor: 'section-1' },
        ...notes.map((n, i) => ({
          id: `n${i + 1}`,
          label: n.heading,
          noteAnchor: n.anchor,
        })),
      ],
      edges: notes.map((_, i) => ({ source: 'root', target: `n${i + 1}` })),
    };

    const quizQuestions: GeneratedContent['quizQuestions'] = [
      ...notes.slice(0, 3).map((n, i) => {
        const { options, correctAnswer } = shuffleOptions(
          n.bullets[0] ?? `Core idea of ${n.heading}`,
          [
            'An unrelated distractor statement.',
            'A partially correct but incomplete statement.',
            'None of the above.',
          ],
          `${input.title}:${n.heading}:${i}`,
        );
        return {
          type: 'MCQ' as const,
          prompt: `Which statement best reflects "${n.heading}" of "${input.title}"?`,
          options,
          correctAnswer,
        };
      }),
      {
        type: 'WRITTEN' as const,
        prompt: `In your own words, explain the main idea of "${input.title}".`,
      },
    ];

    const styleNote = input.learningStyle
      ? ` [Adapted for ${input.learningStyle} style]`
      : '';

    const primarySummary = `"${input.title}" covers ${notes.length} main ideas: ${notes
      .map((n) => n.heading)
      .join(', ')}.${styleNote}`;

    // Provide multi-topic segmentation when there are multiple sections
    const topics =
      notes.length >= 2
        ? notes.map((n, i) => ({
            title: `${input.title}: ${n.heading}`,
            summary: `Covers ${n.heading} in depth.${styleNote}`,
            notes: [n],
            mindMap: {
              nodes: [
                { id: 'root', label: n.heading, noteAnchor: n.anchor },
                ...n.bullets.map((b, bIdx) => ({
                  id: `n${bIdx + 1}`,
                  label: truncateAtWord(b, 40),
                  noteAnchor: n.anchor,
                })),
              ],
              edges: n.bullets.map((_, bIdx) => ({
                source: 'root',
                target: `n${bIdx + 1}`,
              })),
            },
            quizQuestions: quizQuestions.slice(i, i + 2),
          }))
        : undefined;

    return {
      summary: primarySummary,
      notes,
      mindMap,
      quizQuestions,
      topics,
    };
  }

  async answerTutorQuestion(
    input: TutorAnswerInput,
  ): Promise<TutorAnswerOutput> {
    await Promise.resolve();
    const opener = input.learningStyle
      ? STYLE_OPENER[input.learningStyle]
      : "Here's the explanation:";
    const grounding =
      input.contextChunks.length > 0
        ? ` From "${input.contextChunks[0].topicTitle}": ${truncateAtWord(input.contextChunks[0].text, 220)}`
        : " I don't see material on this yet, so this is a general explanation rather than one grounded in your notes.";
    const simplifyNote = input.simplify
      ? ' Simplifying further: think of it as the shortest version of the same idea.'
      : '';

    return {
      answer: `${opener}${grounding}${simplifyNote}`,
    };
  }

  async gradeWrittenResponse(
    input: GradeWrittenInput,
  ): Promise<GradeWrittenOutput> {
    await Promise.resolve();
    const answerWords = new Set(
      input.studentAnswer.toLowerCase().split(/\W+/).filter(Boolean),
    );
    const targetWords = new Set(
      (input.correctAnswer ?? input.prompt)
        .toLowerCase()
        .split(/\W+/)
        .filter(Boolean),
    );
    let overlap = 0;
    for (const w of answerWords) if (targetWords.has(w)) overlap++;
    const coverage = targetWords.size > 0 ? overlap / targetWords.size : 0;
    const lengthSignal = Math.min(1, input.studentAnswer.trim().length / 200);
    const noise = (hash(input.studentAnswer) % 15) / 100; // small deterministic variance
    const score = Math.max(
      0.15,
      Math.min(1, coverage * 0.6 + lengthSignal * 0.3 + noise),
    );

    const styleNote = input.learningStyle
      ? ` ${STYLE_OPENER[input.learningStyle]}`
      : '';
    const feedback =
      score > 0.8
        ? `Strong answer — you covered the key points clearly.${styleNote} One thing to sharpen: tie your explanation back to the specific terms used in the material.`
        : score > 0.5
          ? `Partially correct — you're on the right track but missing some detail.${styleNote} Review the section this question came from and compare your answer to the source notes.`
          : `This needs another pass — the core idea isn't coming through yet.${styleNote} Re-read the relevant notes and try re-explaining it in one sentence before expanding.`;

    return { score: Math.round(score * 100) / 100, feedback };
  }
}
