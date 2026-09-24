import { Injectable, Logger } from '@nestjs/common';
import {
  LearningMethod,
  LearningStyle,
  NoteSection,
  MindMapData,
  AdaptedPresentationResponse,
} from '@aida/shared';
import {
  LlmProvider,
  GeneratedContent,
  GeneratedTopic,
  TutorAnswerInput,
  TutorAnswerOutput,
  GradeWrittenInput,
  GradeWrittenOutput,
  GenerateAdaptedPresentationInput,
} from '../llm.provider';

function repairTruncatedJson(str: string): string {
  let inString = false;
  let isEscaped = false;
  const stack: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === '\\') {
        isEscaped = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === '{' || ch === '[') {
        stack.push(ch);
      } else if (ch === '}' || ch === ']') {
        if (stack.length > 0) {
          const last = stack[stack.length - 1];
          if ((ch === '}' && last === '{') || (ch === ']' && last === '[')) {
            stack.pop();
          }
        }
      }
    }
  }

  let repaired = str;
  if (inString) {
    repaired += '"';
  }

  repaired = repaired.replace(/,\s*$/, '');

  while (stack.length > 0) {
    const open = stack.pop();
    repaired = repaired.replace(/,\s*$/, '');
    if (open === '{') repaired += '}';
    else if (open === '[') repaired += ']';
  }

  return repaired;
}

function extractBalancedJson(raw: string): string {
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // If wrapped in or contains a markdown code fence, inspect that first
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : cleaned;

  const startObj = candidate.indexOf('{');
  const startArr = candidate.indexOf('[');
  let startIdx = -1;
  let openChar = '{';
  let closeChar = '}';

  if (startObj !== -1 && (startArr === -1 || startObj < startArr)) {
    startIdx = startObj;
    openChar = '{';
    closeChar = '}';
  } else if (startArr !== -1) {
    startIdx = startArr;
    openChar = '[';
    closeChar = ']';
  }

  if (startIdx === -1) {
    return candidate;
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = startIdx; i < candidate.length; i++) {
    const ch = candidate[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === '\\') {
        isEscaped = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === openChar) {
        depth++;
      } else if (ch === closeChar) {
        depth--;
        if (depth === 0) {
          return candidate.substring(startIdx, i + 1);
        }
      }
    }
  }

  return repairTruncatedJson(candidate.substring(startIdx));
}

function cleanJsonResponse(text: string): string {
  const extracted = extractBalancedJson(text);
  return extracted.replace(/,\s*([}\]])/g, '$1').trim();
}

function parseLlmJson<T>(raw: string, fallback?: T): T {
  const cleaned = cleanJsonResponse(raw);

  try {
    return JSON.parse(cleaned) as T;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const posMatch = message.match(/position (\d+)/i);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      if (pos > 0 && pos < cleaned.length) {
        try {
          const cut = cleaned.substring(0, pos).trim();
          return JSON.parse(cut) as T;
        } catch {
          // continue
        }
      }
    }

    if (fallback !== undefined) {
      return fallback;
    }
    throw err;
  }
}

function toSafeString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean')
    return val.toString();
  return '';
}

function normalizeQuizQuestions(
  rawQuestions: unknown,
): GeneratedTopic['quizQuestions'] {
  if (!Array.isArray(rawQuestions)) return [];
  const list: unknown[] = rawQuestions;
  const result: GeneratedTopic['quizQuestions'] = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!item || typeof item !== 'object') continue;
    const q = item as Record<string, unknown>;
    const prompt =
      typeof q.prompt === 'string' && q.prompt.trim()
        ? q.prompt.trim()
        : typeof q.question === 'string' && q.question.trim()
          ? q.question.trim()
          : '';
    if (!prompt) continue;

    let options: { id: string; text: string }[] | undefined = undefined;
    const rawOptions = q.options ?? q.answers;
    if (Array.isArray(rawOptions) && rawOptions.length > 0) {
      const optList: unknown[] = rawOptions;
      options = optList.map((opt, optIdx) => {
        if (typeof opt === 'string') {
          return { id: String.fromCharCode(97 + optIdx), text: opt };
        }
        if (opt && typeof opt === 'object') {
          const optObj = opt as Record<string, unknown>;
          return {
            id:
              typeof optObj.id === 'string'
                ? optObj.id
                : String.fromCharCode(97 + optIdx),
            text:
              typeof optObj.text === 'string'
                ? optObj.text
                : toSafeString(optObj.text),
          };
        }
        return {
          id: String.fromCharCode(97 + optIdx),
          text: toSafeString(opt),
        };
      });
    }

    const type: 'MCQ' | 'WRITTEN' =
      q.type === 'WRITTEN' || (!options && q.type !== 'MCQ')
        ? 'WRITTEN'
        : 'MCQ';

    const correctAnswer =
      typeof q.correctAnswer === 'string'
        ? q.correctAnswer
        : typeof q.answer === 'string'
          ? q.answer
          : undefined;

    result.push({
      type,
      prompt,
      options,
      correctAnswer,
    });
  }
  return result;
}

function normalizeNotes(rawNotes: unknown): NoteSection[] {
  if (!Array.isArray(rawNotes)) return [];
  const list: unknown[] = rawNotes;
  const result: NoteSection[] = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (typeof item === 'string') {
      result.push({
        heading: `Key Point ${i + 1}`,
        anchor: `point-${i + 1}`,
        bullets: [item],
      });
    } else if (item && typeof item === 'object') {
      const n = item as Record<string, unknown>;
      const heading =
        typeof n.heading === 'string' ? n.heading : `Section ${i + 1}`;
      const anchor =
        typeof n.anchor === 'string' ? n.anchor : `section-${i + 1}`;
      const rawBullets: unknown[] = Array.isArray(n.bullets) ? n.bullets : [];
      const bullets = rawBullets.map((b) =>
        typeof b === 'string' ? b : toSafeString(b),
      );
      result.push({ heading, anchor, bullets });
    }
  }
  return result;
}

function normalizeMindMap(rawMindMap: unknown): MindMapData {
  if (!rawMindMap || typeof rawMindMap !== 'object') {
    return { nodes: [], edges: [] };
  }
  const mm = rawMindMap as Record<string, unknown>;
  const rawNodes: unknown[] = Array.isArray(mm.nodes) ? mm.nodes : [];
  const nodes = rawNodes.map((item, idx) => {
    if (typeof item === 'string') {
      return { id: `node-${idx + 1}`, label: item, noteAnchor: '' };
    }
    if (item && typeof item === 'object') {
      const n = item as Record<string, unknown>;
      return {
        id: typeof n.id === 'string' ? n.id : `node-${idx + 1}`,
        label:
          typeof n.label === 'string'
            ? n.label
            : typeof n.name === 'string'
              ? n.name
              : `Node ${idx + 1}`,
        noteAnchor: typeof n.noteAnchor === 'string' ? n.noteAnchor : '',
      };
    }
    return { id: `node-${idx + 1}`, label: `Node ${idx + 1}`, noteAnchor: '' };
  });

  const rawEdges: unknown[] = Array.isArray(mm.edges) ? mm.edges : [];
  const edges = rawEdges
    .map((item) => {
      if (item && typeof item === 'object') {
        const e = item as Record<string, unknown>;
        return {
          source:
            typeof e.source === 'string'
              ? e.source
              : typeof e.from === 'string'
                ? e.from
                : '',
          target:
            typeof e.target === 'string'
              ? e.target
              : typeof e.to === 'string'
                ? e.to
                : '',
          label: typeof e.label === 'string' ? e.label : undefined,
        };
      }
      return { source: '', target: '' };
    })
    .filter((e) => e.source && e.target);

  return { nodes, edges };
}

function normalizeGeneratedContent(
  raw: unknown,
  fallbackTitle: string,
): GeneratedContent {
  const parsed = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;

  const rootSummary = typeof parsed.summary === 'string' ? parsed.summary : '';
  const rootNotes = normalizeNotes(parsed.notes);
  const rootMindMap = normalizeMindMap(parsed.mindMap);
  const rootQuiz = normalizeQuizQuestions(parsed.quizQuestions);

  let topics: GeneratedTopic[] = [];

  if (Array.isArray(parsed.topics) && parsed.topics.length > 0) {
    const rawTopicList: unknown[] = parsed.topics;
    topics = rawTopicList.map((item, idx) => {
      const t = (item && typeof item === 'object' ? item : {}) as Record<
        string,
        unknown
      >;
      const title =
        typeof t.title === 'string' && t.title.trim()
          ? t.title.trim()
          : idx === 0
            ? fallbackTitle
            : `Topic ${idx + 1}`;
      const summary = typeof t.summary === 'string' ? t.summary : rootSummary;
      const notes = normalizeNotes(t.notes);
      const mindMap = normalizeMindMap(t.mindMap);
      let quizQuestions = normalizeQuizQuestions(t.quizQuestions);

      // If topic has no questions but root does, share root questions
      if (quizQuestions.length === 0 && idx === 0 && rootQuiz.length > 0) {
        quizQuestions = rootQuiz;
      }

      return {
        title,
        summary,
        notes: notes.length > 0 ? notes : idx === 0 ? rootNotes : [],
        mindMap:
          mindMap.nodes.length > 0
            ? mindMap
            : idx === 0
              ? rootMindMap
              : { nodes: [], edges: [] },
        quizQuestions,
      };
    });
  } else {
    topics = [
      {
        title: fallbackTitle,
        summary: rootSummary,
        notes: rootNotes,
        mindMap: rootMindMap,
        quizQuestions: rootQuiz,
      },
    ];
  }

  const primary = topics[0];
  const allQuiz =
    rootQuiz.length > 0 ? rootQuiz : topics.flatMap((t) => t.quizQuestions);

  return {
    topics,
    summary: primary.summary || rootSummary,
    notes: primary.notes.length > 0 ? primary.notes : rootNotes,
    mindMap: primary.mindMap.nodes.length > 0 ? primary.mindMap : rootMindMap,
    quizQuestions: allQuiz,
  };
}

/**
 * Primary: Groq API (openai/gpt-oss-120b).
 * Backup: Cloudflare Workers AI (@cf/meta/llama-3.3-70b-instruct-fp8-fast) with automatic runtime failover.
 */
@Injectable()
export class LiveLlmProvider extends LlmProvider {
  private readonly logger = new Logger(LiveLlmProvider.name);

  private readonly groqApiKey =
    process.env.GROQ_API_KEY ?? process.env.LLM_API_KEY;
  private readonly groqModel =
    process.env.GROQ_LLM_MODEL ?? 'openai/gpt-oss-120b';

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
    const maxChars = parseInt(process.env.MAX_LLM_INPUT_CHARS ?? '60000', 10);
    let material = input.rawText;
    if (material.length > maxChars) {
      this.logger.warn(
        `Material for "${input.title}" exceeds safe LLM context limit (${material.length} chars, ~${Math.round(material.length / 4)} tokens). Truncating to ${maxChars} chars for note generation.`,
      );
      const half = Math.floor((maxChars - 100) / 2);
      material = `${material.slice(0, half)}\n\n[... content truncated to fit model context limits ...]\n\n${material.slice(-half)}`;
    }

    const stylePrompt = input.learningStyle
      ? ` Explain in a style suited to: ${input.learningStyle}.`
      : '';
    const system =
      `You generate study notes as JSON with this exact shape: ` +
      `{"topics":[{"title":"...","summary":"...","notes":[{"heading":"...","anchor":"...","bullets":["..."]}],` +
      `"mindMap":{"nodes":[{"id":"...","label":"...","noteAnchor":"..."}],"edges":[{"source":"...","target":"..."}]},` +
      `"quizQuestions":[{"type":"MCQ|WRITTEN","prompt":"...","options":[{"id":"a","text":"..."}],"correctAnswer":"..."}]}]}.` +
      ` Identify 1-5 logical topics/sections from the material and generate separate notes for each.${stylePrompt}` +
      ` Respond ONLY with the valid JSON object and nothing else. No conversational prelude or outro. Keep notes high-yield, concise, and structured.`;
    const content = await this.chatComplete(
      system,
      `Title: ${input.title}\n\nMaterial:\n${material}`,
      true,
    );
    const parsed = parseLlmJson<unknown>(content, {
      topics: [
        {
          title: input.title,
          summary: '',
          notes: [],
          mindMap: { nodes: [], edges: [] },
          quizQuestions: [],
        },
      ],
    });
    return normalizeGeneratedContent(parsed, input.title);
  }

  async answerTutorQuestion(
    input: TutorAnswerInput,
  ): Promise<TutorAnswerOutput> {
    const system =
      "You are AIDA's personal AI study tutor. Answer strictly grounded in the provided context chunks from the student's own material. If the answer isn't in the context, say so rather than guessing. Format your response cleanly using GitHub-flavored Markdown: use bolding for key terms, clean bullet points or numbered lists, and Markdown tables when organizing structured data. Never output raw ASCII-art box drawings or character grids with '+' and '-' lines.";

    const context = input.contextChunks
      .map((c) => `[${c.topicTitle} / ${c.noteAnchor}] ${c.text}`)
      .join('\n\n');

    const styleNotes: string[] = [];

    // Legacy single learningStyle support
    if (input.learningStyle) {
      if (input.learningStyle === LearningStyle.DIAGRAMS) {
        styleNotes.push(
          'The student learns best with visual structure: present explanations using structured hierarchical outlines, step-by-step numbered flows, and clean Markdown comparison tables (do NOT draw ASCII-art boxes).',
        );
      } else if (input.learningStyle === LearningStyle.ANALOGIES) {
        styleNotes.push(
          'The student learns best with analogies: use intuitive real-world comparisons to clarify abstract ideas.',
        );
      } else if (input.learningStyle === LearningStyle.STORIES) {
        styleNotes.push(
          'The student learns best through stories: frame key concepts in a concise narrative scenario.',
        );
      } else if (input.learningStyle === LearningStyle.FORMULAS) {
        styleNotes.push(
          'The student learns best with formulas: provide compact, formal, step-by-step principles and relationships.',
        );
      } else if (input.learningStyle === LearningStyle.AUDIO) {
        styleNotes.push(
          'The student learns best through audio: explain in a natural, conversational, spoken-word cadence.',
        );
      }
    }

    // Multi-method learning preferences override / extend
    if (input.learningMethods && input.learningMethods.length > 0) {
      const methodInstructions: Partial<Record<LearningMethod, string>> = {
        [LearningMethod.VISUAL]:
          'Use structured hierarchical outlines, Markdown tables, mermaid-style diagrams (in code fences), and numbered flows to illustrate relationships visually.',
        [LearningMethod.STORIES_ANALOGIES]:
          'Frame key concepts using relatable real-world stories and analogies. Connect abstract ideas to everyday experiences.',
        [LearningMethod.MIND_MAPS]:
          'Structure your answer showing how concepts relate hierarchically: parent → child relationships, central themes → subtopics.',
        [LearningMethod.AUDIO]:
          'Write in a natural conversational cadence as if speaking aloud. Use simple transitions, rhetorical questions, and an inviting spoken-word tone.',
        [LearningMethod.DIRECT_NOTES]:
          'Deliver concise, structured notes: bullet-point key facts, avoid padding, prioritize high-yield information.',
        [LearningMethod.CONVERSATIONAL]:
          'Teach through a Socratic, back-and-forth style. Ask a guiding question, then answer it. Make the student feel like they are figuring it out themselves.',
        [LearningMethod.PRACTICAL_EXAMPLES]:
          'Ground every concept in practical, real-world examples. Show what it looks like in production, in daily life, or in industry.',
        [LearningMethod.SCENARIOS]:
          'Present a realistic scenario or use-case that requires applying the concept, then walk through how the concept solves the challenge.',
        [LearningMethod.STEP_BY_STEP]:
          'Break explanations into numbered sequential steps. Each step builds on the previous one. Include a brief checkpoint at the end of each step.',
      };

      for (const method of input.learningMethods) {
        const instruction = methodInstructions[method];
        if (instruction) styleNotes.push(instruction);
      }
    }

    const styleNote = styleNotes.join(' ');

    const simplifyNote = input.simplify
      ? 'Simplify the explanation significantly: focus only on the absolute core takeaway in plain, crystal-clear language (ELIF / explain-like-I-am-12 style).'
      : '';

    const historySection =
      input.history && input.history.length > 0
        ? `\n\nRecent Conversation History:\n${input.history
            .map(
              (h) =>
                `${h.role === 'user' ? 'Student' : 'Tutor'}: ${h.content.slice(0, 400)}`,
            )
            .join('\n')}`
        : '';

    const prompt = `Context:\n${context}${historySection}\n\nStudent Question: ${input.question}`;

    const rawAnswer = await this.chatComplete(
      [system, styleNote, simplifyNote].filter(Boolean).join(' '),
      prompt,
      false,
    );
    const answer = rawAnswer.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return { answer };
  }

  async gradeWrittenResponse(
    input: GradeWrittenInput,
  ): Promise<GradeWrittenOutput> {
    const styleNote = input.learningStyle
      ? ` Phrase all qualitative feedback to match the student's learning style preference: ${input.learningStyle} (e.g. use diagrams/analogies/stories/formulas/audio-style language as appropriate).`
      : '';
    const system = `Grade the student answer against the prompt and reference answer. Respond as JSON: {"score": 0-1, "feedback": "specific, qualitative feedback"}.${styleNote} Respond ONLY with the valid JSON object.`;
    const content = await this.chatComplete(
      system,
      `Prompt: ${input.prompt}\nReference answer: ${input.correctAnswer ?? '(none provided)'}\nStudent answer: ${input.studentAnswer}`,
      true,
    );
    return parseLlmJson<GradeWrittenOutput>(content, {
      score: 0.5,
      feedback: 'Answer submitted and reviewed.',
    });
  }

  async generateAdaptedPresentation(
    input: GenerateAdaptedPresentationInput,
  ): Promise<AdaptedPresentationResponse['content']> {
    const notesText = input.notes
      .map(
        (n: NoteSection) =>
          `${n.heading}:\n${n.bullets.map((b: string) => `- ${b}`).join('\n')}`,
      )
      .join('\n\n');

    const materialContext = input.rawText
      ? input.rawText.slice(0, 8000)
      : notesText;

    const methodPrompts: Record<
      LearningMethod,
      { system: string; userHint: string }
    > = {
      [LearningMethod.VISUAL]: {
        system:
          `You generate visual learning content as JSON. For the given topic, produce a mermaid flowchart/diagram and a visual breakdown table.` +
          ` Respond ONLY with valid JSON: {"diagramType":"mermaid","mermaidCode":"...","charts":[{"title":"...","explanation":"..."}],"visualBreakdown":[{"title":"...","content":"...","keyTakeaway":"..."}]}`,
        userHint: 'visual diagrams and charts',
      },
      [LearningMethod.STORIES_ANALOGIES]: {
        system:
          `You generate stories and analogies learning content as JSON.` +
          ` Respond ONLY with valid JSON: {"coreStory":{"title":"...","narrative":"...","moralOrTakeaway":"..."},"analogies":[{"concept":"...","analogy":"...","whyItWorks":"..."}]}`,
        userHint: 'stories and analogies',
      },
      [LearningMethod.MIND_MAPS]: {
        system:
          `You generate mind map content as JSON with nodes and edges representing topic relationships.` +
          ` Respond ONLY with valid JSON: {"markdown":"...","directNotes":[{"heading":"...","anchor":"...","bullets":["..."]}]}`,
        userHint: 'mind map structure with relationship connections',
      },
      [LearningMethod.AUDIO]: {
        system:
          `You generate an audio lesson script as JSON with a natural spoken-word cadence.` +
          ` Respond ONLY with valid JSON: {"title":"...","intro":"...","sections":[{"heading":"...","spokenText":"..."}],"recap":"...","durationEstimateMinutes":5}`,
        userHint: 'conversational audio lesson script',
      },
      [LearningMethod.DIRECT_NOTES]: {
        system:
          `You generate structured study notes as JSON. Produce concise, high-yield notes with markdown summary.` +
          ` Respond ONLY with valid JSON: {"directNotes":[{"heading":"...","anchor":"...","bullets":["..."]}],"markdown":"..."}`,
        userHint: 'direct structured notes',
      },
      [LearningMethod.CONVERSATIONAL]: {
        system:
          `You generate an engaging conversational Socratic teaching dialogue as JSON between a Tutor and a Student.` +
          ` Respond ONLY with valid JSON: {"title":"...","introduction":"...","dialogue":[{"speaker":"tutor","text":"..."},{"speaker":"student","text":"..."}],"summaryTakeaway":"..."}`,
        userHint: 'interactive Socratic conversational dialogue',
      },
      [LearningMethod.PRACTICAL_EXAMPLES]: {
        system:
          `You generate practical real-world examples as JSON for each concept.` +
          ` Respond ONLY with valid JSON: {"examples":[{"title":"...","context":"...","demonstration":"...","realWorldImpact":"..."}]}`,
        userHint: 'practical real-world examples',
      },
      [LearningMethod.SCENARIOS]: {
        system:
          `You generate scenario-based learning content as JSON with realistic situations.` +
          ` Respond ONLY with valid JSON: {"scenarios":[{"title":"...","scenario":"...","challenge":"...","optimalApproach":"...","analysis":"..."}]}`,
        userHint: 'realistic scenarios and use-cases',
      },
      [LearningMethod.STEP_BY_STEP]: {
        system:
          `You generate a step-by-step progressive learning guide as JSON.` +
          ` Respond ONLY with valid JSON: {"overview":"...","steps":[{"stepNumber":1,"title":"...","explanation":"...","keyActionOrRule":"...","quickCheckQuestion":"...","quickCheckAnswer":"..."}]}`,
        userHint: 'step-by-step sequential progression',
      },
    };

    const methodConfig = methodPrompts[input.method];

    const rawContent = await this.chatComplete(
      methodConfig.system,
      `Topic: ${input.topicTitle}\nSummary: ${input.summary}\n\nNotes:\n${notesText}\n\nSource Material:\n${materialContext}\n\nGenerate ${methodConfig.userHint} for this topic.`,
      true,
    );

    try {
      const parsed = parseLlmJson<Record<string, unknown>>(rawContent, {});
      // Use double-cast (via unknown) to bridge the structural gap between the
      // parsed JSON record and the typed presentation interfaces.
      const u = parsed as unknown;

      // Map parsed JSON to the correct content shape based on method
      switch (input.method) {
        case LearningMethod.VISUAL:
          return {
            visual: u as AdaptedPresentationResponse['content']['visual'],
          };
        case LearningMethod.STORIES_ANALOGIES:
          return {
            storiesAnalogies:
              u as AdaptedPresentationResponse['content']['storiesAnalogies'],
          };
        case LearningMethod.AUDIO:
          return {
            audioLesson:
              u as AdaptedPresentationResponse['content']['audioLesson'],
          };
        case LearningMethod.PRACTICAL_EXAMPLES:
          return {
            practicalExamples:
              u as AdaptedPresentationResponse['content']['practicalExamples'],
          };
        case LearningMethod.SCENARIOS:
          return {
            scenarios: u as AdaptedPresentationResponse['content']['scenarios'],
          };
        case LearningMethod.STEP_BY_STEP:
          return {
            stepByStep:
              u as AdaptedPresentationResponse['content']['stepByStep'],
          };
        case LearningMethod.CONVERSATIONAL:
          return {
            conversational:
              u as AdaptedPresentationResponse['content']['conversational'],
            markdown:
              typeof parsed.markdown === 'string' ? parsed.markdown : undefined,
          };
        case LearningMethod.MIND_MAPS:
        case LearningMethod.DIRECT_NOTES:
        default:
          return {
            directNotes: (parsed.directNotes as NoteSection[]) ?? input.notes,
            markdown:
              typeof parsed.markdown === 'string' ? parsed.markdown : undefined,
          };
      }
    } catch {
      // Fallback: return direct notes
      return { directNotes: input.notes };
    }
  }
}
