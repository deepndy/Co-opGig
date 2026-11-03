import { describe, expect, it } from 'vitest';
import { mockAssistantChat, mockClassify } from '../mock/mockAssistant';

describe('demo classifier (keyword baseline, not a model)', () => {
  it('suggests a plumber for a clear water leak', () => {
    const result = mockClassify('Water leaking below the kitchen sink and the cabinet is damp');
    expect(result.category).toBe('plumber');
    expect(result.reason).toContain('demo keyword estimate');
  });

  it('asks a clarifying question for a vague description', () => {
    const result = mockClassify('I need someone for something in my house');
    expect(result.category).toBeNull();
    expect(result.needsClarification).toBe(true);
    expect(result.clarifyingQuestion).toBeTruthy();
  });
});

describe('demo assistant', () => {
  it('keeps a stable session and hands off for review without booking', async () => {
    const first = await mockAssistantChat({
      sessionId: null,
      message: 'Water is leaking under the kitchen sink',
      jobContext: {},
    });
    expect(first.sessionId).toBeTruthy();
    expect(first.nextAction).toBe('SUGGEST_CATEGORY');
    expect(first.reply.toLowerCase()).toContain('locality');

    const second = await mockAssistantChat({
      sessionId: first.sessionId,
      message: 'Kothrud',
      jobContext: {},
    });
    expect(second.sessionId).toBe(first.sessionId);
    expect(second.nextAction).toBe('HANDOFF_TO_BOOKING');
    expect(second.reply.toLowerCase()).toContain('review');
    expect(second.reply.toLowerCase()).toContain('won’t post');
    expect(second.suggestedCategory).toBe('plumber');
  });

  it('returns safety guidance for a dangerous description without repair steps', async () => {
    const result = await mockAssistantChat({
      sessionId: null,
      message: 'There is smoke and a burning smell near the switchboard',
      jobContext: {},
    });
    const text = result.reply.toLowerCase();
    expect(text).toContain('move away');
    expect(text).toContain('emergency services');
    expect(text).not.toContain('open the panel');
    expect(result.extractedFields?.urgency).toBe('emergency');
  });
});
