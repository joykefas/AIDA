import { LiveLlmProvider } from './live-llm.provider';

describe('LiveLlmProvider Normalization & Error Resilience', () => {
  let provider: LiveLlmProvider;

  beforeEach(() => {
    provider = new LiveLlmProvider();
  });

  it('should normalize LLM response where topics array has missing quizQuestions', async () => {
    const rawLlmOutput = JSON.stringify({
      topics: [
        {
          title: 'Cell Division',
          summary: 'Mitosis and Meiosis',
          notes: [
            {
              heading: 'Mitosis',
              anchor: 'mitosis',
              bullets: ['Prophase', 'Metaphase'],
            },
          ],
          mindMap: {
            nodes: [{ id: '1', label: 'Mitosis', noteAnchor: 'mitosis' }],
            edges: [],
          },
          // quizQuestions is completely missing from topic
        },
      ],
    });

    jest
      .spyOn<any, any>(provider, 'chatComplete')
      .mockResolvedValue(rawLlmOutput);

    const result = await provider.generateContent({
      title: 'Biology 101',
      rawText: 'Sample material',
    });

    expect(result.topics).toBeDefined();
    expect(result.topics).toHaveLength(1);
    expect(Array.isArray(result.topics![0].quizQuestions)).toBe(true);
    expect(result.topics![0].quizQuestions).toEqual([]);
    expect(Array.isArray(result.quizQuestions)).toBe(true);
  });

  it('should normalize alternative formats (question/answers, name instead of label in mindMap, string notes)', async () => {
    const rawLlmOutput = JSON.stringify({
      topics: [
        {
          title: 'Photosynthesis',
          summary: 'Plants make food',
          notes: ['Plants convert sunlight into energy'],
          mindMap: {
            nodes: [{ name: 'Sunlight' }, { name: 'Chlorophyll' }],
            edges: [{ from: 'node-1', to: 'node-2' }],
          },
          quizQuestions: [
            {
              question: 'What is required for photosynthesis?',
              answers: ['Sunlight', 'Darkness'],
              correctAnswer: 'Sunlight',
            },
          ],
        },
      ],
    });

    jest
      .spyOn<any, any>(provider, 'chatComplete')
      .mockResolvedValue(rawLlmOutput);

    const result = await provider.generateContent({
      title: 'Botany',
      rawText: 'Sample text',
    });

    const topic = result.topics![0];
    expect(topic.title).toBe('Photosynthesis');
    // String note should be converted to NoteSection
    expect(topic.notes[0].bullets).toContain(
      'Plants convert sunlight into energy',
    );
    // Nodes with name should be converted to label
    expect(topic.mindMap.nodes[0].label).toBe('Sunlight');
    expect(topic.mindMap.edges[0].source).toBe('node-1');
    expect(topic.mindMap.edges[0].target).toBe('node-2');
    // Question/answers should be converted to prompt/options
    expect(topic.quizQuestions[0].prompt).toBe(
      'What is required for photosynthesis?',
    );
    expect(topic.quizQuestions[0].options).toEqual([
      { id: 'a', text: 'Sunlight' },
      { id: 'b', text: 'Darkness' },
    ]);
    expect(result.quizQuestions).toHaveLength(1);
  });

  it('should clean reasoning tags (<think>...</think>) and markdown fences cleanly', async () => {
    const rawLlmOutput = `<think>
I need to generate study notes in JSON format.
</think>
\`\`\`json
{
  "summary": "Root summary",
  "notes": [],
  "mindMap": { "nodes": [], "edges": [] },
  "quizQuestions": []
}
\`\`\``;

    jest
      .spyOn<any, any>(provider, 'chatComplete')
      .mockResolvedValue(rawLlmOutput);

    const result = await provider.generateContent({
      title: 'Thinking Model Test',
      rawText: 'Some material',
    });

    expect(result.summary).toBe('Root summary');
    expect(result.topics).toHaveLength(1);
    expect(result.topics![0].title).toBe('Thinking Model Test');
  });
});
