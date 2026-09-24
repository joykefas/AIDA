import { Injectable } from '@nestjs/common';
import {
  LearningMethod,
  LearningStyle,
  AdaptedPresentationResponse,
} from '@aida/shared';
import {
  LlmProvider,
  GeneratedContent,
  TutorAnswerInput,
  TutorAnswerOutput,
  GradeWrittenInput,
  GradeWrittenOutput,
  GenerateAdaptedPresentationInput,
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
      Math.max(1, Math.ceil(input.rawText.length / 400)),
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

  async generateAdaptedPresentation(
    input: GenerateAdaptedPresentationInput,
  ): Promise<AdaptedPresentationResponse['content']> {
    await Promise.resolve();
    const { topicTitle, summary, notes, method } = input;
    const bullets = notes.flatMap((n) => n.bullets);

    switch (method) {
      case LearningMethod.VISUAL: {
        const nodeLines = notes
          .slice(0, 4)
          .map(
            (n, i) =>
              `  N${i + 1}["${n.heading.replace(/"/g, "'")}"] --> D${i + 1}["${(n.bullets[0] ?? 'Core insight').slice(0, 40).replace(/"/g, "'")}"]`,
          )
          .join('\n');
        const mermaid = `graph TD\n  Root["${topicTitle.replace(/"/g, "'")}"]\n${nodeLines}`;
        return {
          visual: {
            diagramType: 'mermaid',
            mermaidCode: mermaid,
            charts: [
              {
                title: 'Concept Architecture',
                explanation: `Visual breakdown of how key components in ${topicTitle} interconnect and build upon each other.`,
              },
            ],
            visualBreakdown: notes.map((n) => ({
              title: n.heading,
              content: n.bullets.join(' '),
              keyTakeaway: n.bullets[0] ?? 'Key structural concept',
            })),
          },
        };
      }
      case LearningMethod.STORIES_ANALOGIES: {
        return {
          storiesAnalogies: {
            coreStory: {
              title: `The Story of ${topicTitle}`,
              narrative: `Picture an architect designing a resilient city. Rather than building everything at once, each subsystem in ${topicTitle} operates like a dedicated district. ${summary || bullets[0] || 'Every part plays a distinct role in keeping the entire system operating cohesively.'}`,
              moralOrTakeaway: `Just like a city thrives when its districts communicate smoothly, mastering ${topicTitle} depends on understanding how these individual components coordinate.`,
            },
            analogies: notes.map((n, i) => ({
              concept: n.heading,
              analogy:
                i === 0
                  ? `Like the foundational blueprints of a bridge, ensuring stability under pressure.`
                  : i === 1
                    ? `Like a conductor keeping an orchestra in rhythm without playing the instruments directly.`
                    : `Like a courier dispatching urgent parcels along optimal highways.`,
              whyItWorks: `It takes the abstract principles of ${n.heading} and grounds them in a dynamic everyday mechanism you intuitively recognize.`,
            })),
          },
        };
      }
      case LearningMethod.PRACTICAL_EXAMPLES: {
        return {
          practicalExamples: {
            examples: notes.map((n, i) => ({
              title: `Real-World Case #${i + 1}: ${n.heading}`,
              context: `How industry teams encounter ${n.heading} during live operations or problem-solving.`,
              demonstration:
                n.bullets[0] ??
                `Step 1: Identify input parameters. Step 2: Apply ${n.heading} guidelines. Step 3: Validate the outcome against benchmarks.`,
              realWorldImpact: `Prevents common bottlenecks and ensures reliable, predictable execution in production environments.`,
            })),
          },
        };
      }
      case LearningMethod.SCENARIOS: {
        return {
          scenarios: {
            scenarios: notes.map((n, i) => ({
              title: `Scenario ${i + 1}: Deploying ${n.heading} Under Pressure`,
              scenario: `A critical project deadline is 48 hours away. Your team encounters a conflict relating to ${n.heading}. Initial data indicates inconsistent outputs.`,
              challenge: `How do you triage the root cause without disrupting existing workflows?`,
              optimalApproach: `Leverage the principles of ${n.heading}: ${n.bullets[0] ?? 'Isolate variables and trace data flow step-by-step.'}`,
              analysis: `By adhering to the structured rules of ${topicTitle}, you eliminate guesswork and resolve the incident systematically.`,
            })),
          },
        };
      }
      case LearningMethod.STEP_BY_STEP: {
        return {
          stepByStep: {
            overview: `Progressive walkthrough to master ${topicTitle} step-by-step from fundamental principles to practical mastery.`,
            steps: notes.map((n, i) => ({
              stepNumber: i + 1,
              title: n.heading,
              explanation:
                n.bullets.join(' ') ||
                `Mastering this phase provides the foundation for subsequent topics.`,
              keyActionOrRule: `Rule ${i + 1}: Keep ${n.heading} clearly scoped before moving to subsequent implementations.`,
              quickCheckQuestion: `What is the primary objective of ${n.heading}?`,
              quickCheckAnswer:
                n.bullets[0] ??
                `To establish a reliable baseline according to ${topicTitle}.`,
            })),
          },
        };
      }
      case LearningMethod.AUDIO: {
        return {
          audioLesson: {
            title: `Audio Masterclass: ${topicTitle}`,
            intro: `Welcome to this spoken lesson on ${topicTitle}. In this session, we'll walk through the core ideas simply, clearly, and naturally, so you can learn on the go.`,
            sections: notes.map((n) => ({
              heading: n.heading,
              spokenText: `Let's focus on ${n.heading}. ${n.bullets.join('. ')}. Keep in mind why this matters: it establishes how the rest of the material connects together.`,
            })),
            recap: `To wrap up our listen: remember that ${topicTitle} centers on these key pillars. Replay this anytime while commuting or taking a walk to solidify your recall.`,
            durationEstimateMinutes: Math.max(
              2,
              Math.ceil((bullets.join(' ').length + 200) / 750),
            ),
          },
        };
      }
      case LearningMethod.DIRECT_NOTES:
      default: {
        return {
          directNotes: notes,
          markdown: `## ${topicTitle}\n\n${summary}\n\n${notes.map((n) => `### ${n.heading}\n${n.bullets.map((b) => `- ${b}`).join('\n')}`).join('\n\n')}`,
        };
      }
    }
  }
}
