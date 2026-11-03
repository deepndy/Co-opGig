import { BRAND } from '../../config/brand';
import { formatCategoryLabel, isKnownCategory } from '../../config/serviceCategories';
import type { AssistantChatInput, AssistantReply, ClassificationResult } from '../../types/api';
import type { Urgency } from '../../types/domain';
import { ApiError } from '../errors';

/**
 * A transparent keyword demo used only when VITE_USE_MOCK_API is enabled.
 * It is deliberately labelled as a demo in the UI and is NOT a model.
 */
const KEYWORDS: Record<string, string[]> = {
  electrician: [
    'electrician',
    'electric',
    'electrical',
    'wiring',
    'wire',
    'switch',
    'socket',
    'plug point',
    'light',
    'bulb',
    'fan',
    'power',
    'circuit',
    'fuse',
    'mcb',
    'short circuit',
  ],
  plumber: [
    'plumber',
    'plumbing',
    'leak',
    'leaking',
    'tap',
    'sink',
    'drain',
    'pipe',
    'toilet',
    'water',
    'seepage',
    'bathroom fitting',
    'geyser',
  ],
  carpenter: [
    'carpenter',
    'carpentry',
    'wood',
    'wooden',
    'furniture',
    'door',
    'cupboard',
    'wardrobe',
    'hinge',
    'shelf',
    'table',
    'chair',
  ],
  painter: ['painter', 'painting', 'paint', 'wall', 'ceiling', 'putty', 'colour', 'color', 'whitewash'],
  cleaner: ['cleaner', 'cleaning', 'clean', 'dust', 'dusting', 'sweep', 'mop', 'deep clean', 'housekeeping'],
  gardener: ['gardener', 'garden', 'plant', 'lawn', 'tree', 'prune', 'pruning', 'hedge', 'watering'],
  driver: ['driver', 'drive', 'car', 'vehicle', 'trip', 'airport', 'chauffeur', 'errand'],
  caregiver: ['caregiver', 'care', 'elderly', 'senior', 'companion', 'companionship', 'patient support'],
  technician: ['technician', 'wifi', 'wi-fi', 'internet', 'computer', 'laptop', 'network', 'router', 'tv setup', 'cctv'],
  'domestic-helper': ['domestic helper', 'maid', 'household', 'cooking', 'dishes', 'chores', 'house help'],
  mason: ['mason', 'brick', 'brickwork', 'cement', 'plaster', 'plastering', 'tile', 'tiling', 'construction'],
  'appliance-repair': [
    'appliance repair',
    'appliance',
    'washing machine',
    'fridge',
    'refrigerator',
    'microwave',
    'mixer',
    'oven',
    'air conditioner',
    'air conditioner repair',
    'ac repair',
  ],
};

const SAFETY_PATTERN =
  /\b(gas leak|smell(?:s|ing)? gas|smoke|fire|sparks?|sparking|shock|electrocut\w*|live wire|exposed wire|burning smell)\b/i;

const URGENT_PATTERN = /\b(urgent|urgently|asap|today|quick|quickly)\b/i;
const EMERGENCY_PATTERN = /\b(emergency|immediately|right now|dangerous)\b/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function keywordPattern(keyword: string): RegExp {
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i');
}

interface ScoredCategory {
  category: string;
  score: number;
  matches: string[];
}

function scoreDescription(description: string): ScoredCategory[] {
  return Object.entries(KEYWORDS)
    .map(([category, keywords]) => {
      const matches = keywords.filter((keyword) => keywordPattern(keyword).test(description));
      return { category, score: matches.length, matches };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

function confidenceFor(score: number): number {
  return Math.min(0.9, Math.round((0.48 + score * 0.09) * 100) / 100);
}

function clarifyQuestion(): string {
  return 'What kind of help do you need — water, electricity, furniture, cleaning, an appliance, or something else?';
}

function classificationFromDescription(description: string): ClassificationResult {
  const clean = description.trim();
  if (clean.length < 4) {
    return {
      category: null,
      confidence: null,
      alternatives: [],
      needsClarification: true,
      clarifyingQuestion: 'Please describe what needs fixing, even in a short sentence.',
      reason: 'The description is too short to suggest a category.',
    };
  }

  const scored = scoreDescription(clean);
  if (scored.length === 0) {
    return {
      category: null,
      confidence: null,
      alternatives: [],
      needsClarification: true,
      clarifyingQuestion: clarifyQuestion(),
      reason: 'No service keywords were recognised, so a category cannot be suggested yet.',
    };
  }

  const top = scored[0];
  const second = scored[1];
  const confidence = confidenceFor(top.score);
  const tie = second ? top.score - second.score === 0 : false;
  const unclear = confidence < 0.62 || tie;
  const alternatives = scored
    .slice(0, 3)
    .map((entry) => ({ category: entry.category, confidence: confidenceFor(entry.score) }))
    .filter((entry) => entry.category !== top.category || !unclear)
    .slice(0, 3);

  return {
    category: unclear ? null : top.category,
    confidence,
    alternatives: unclear ? alternatives.slice(0, 3) : alternatives.filter((a) => a.category !== top.category).slice(0, 3),
    needsClarification: unclear,
    clarifyingQuestion: unclear
      ? `Could you share one more detail? Is this mainly about ${formatCategoryLabel(
          top.category,
        ).toLowerCase()} work, or a different kind of help?`
      : null,
    reason: `The description mentions ${top.matches
      .slice(0, 3)
      .map((word) => `“${word}”`)
      .join(', ')}. This is a demo keyword estimate, not a trained-model score.`,
  };
}

interface ChatSessionState {
  id: string;
  description: string | null;
  category: string | null;
  locationText: string | null;
  urgency: Urgency | null;
  awaitingLocation: boolean;
  handedOff: boolean;
}

const sessions = new Map<string, ChatSessionState>();

function newSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `demo-${crypto.randomUUID()}`;
  }
  return `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ensureSession(sessionId: string | null | undefined): ChatSessionState {
  if (sessionId && sessions.has(sessionId)) return sessions.get(sessionId) as ChatSessionState;
  if (sessions.size > 49) {
    const first = sessions.keys().next().value;
    if (first) sessions.delete(first);
  }
  const state: ChatSessionState = {
    id: sessionId || newSessionId(),
    description: null,
    category: null,
    locationText: null,
    urgency: null,
    awaitingLocation: false,
    handedOff: false,
  };
  sessions.set(state.id, state);
  return state;
}

function extractUrgency(message: string): Urgency | null {
  if (EMERGENCY_PATTERN.test(message) || SAFETY_PATTERN.test(message)) return 'emergency';
  if (URGENT_PATTERN.test(message)) return 'urgent';
  return null;
}

function looksLikeGreeting(message: string): boolean {
  return /^(hi|hello|hey|namaste|good morning|good evening)[\s!.,]*$/i.test(message.trim());
}

function updateDescription(state: ChatSessionState, message: string): void {
  if (!state.description) {
    state.description = message.slice(0, 600);
    return;
  }
  if (message.length > 18 && !state.awaitingLocation) {
    state.description = `${state.description} ${message}`.slice(0, 600);
  }
}

function buildReply(
  state: ChatSessionState,
  reply: string,
  nextAction: AssistantReply['nextAction'],
  confidence: number | null,
  needsClarification: boolean,
): AssistantReply {
  return {
    sessionId: state.id,
    reply,
    suggestedCategory: state.category,
    confidence,
    needsClarification,
    nextAction,
    extractedFields: {
      description: state.description,
      category: state.category,
      locationText: state.locationText,
      urgency: state.urgency,
    },
  };
}

export async function mockAssistantChat(input: AssistantChatInput): Promise<AssistantReply> {
  const message = input.message.trim();
  if (!message) {
    throw new ApiError({ code: 'VALIDATION_ERROR', message: 'Please type a short message first.', status: 400 });
  }
  if (message.length > BRAND.maxChatMessageLength) {
    throw new ApiError({
      code: 'VALIDATION_ERROR',
      message: `Please keep the message under ${BRAND.maxChatMessageLength} characters.`,
      status: 400,
    });
  }

  const state = ensureSession(input.sessionId);
  if (input.jobContext?.category && isKnownCategory(input.jobContext.category)) {
    state.category = input.jobContext.category;
  }
  if (input.jobContext?.locationText && !state.locationText) {
    state.locationText = input.jobContext.locationText.slice(0, 120);
  }
  state.urgency = state.urgency ?? extractUrgency(message);

  if (SAFETY_PATTERN.test(message)) {
    state.urgency = 'emergency';
    return buildReply(
      state,
      'This may be an immediate safety risk. Please move away from the hazard, avoid touching exposed wiring, switches or gas appliances, and contact local emergency services or a qualified professional. I can’t guide repairs. Once you are safe, share your locality if you want to request an inspection.',
      'ASK_QUESTION',
      null,
      true,
    );
  }

  if (looksLikeGreeting(message) && !state.description) {
    return buildReply(
      state,
      `Hello — I can help you find the right service. ${clarifyQuestion()}`,
      'ASK_QUESTION',
      null,
      true,
    );
  }

  if (state.awaitingLocation) {
    const categoryWords = scoreDescription(message).length > 0;
    if (!categoryWords && message.length <= 100) {
      state.locationText = message.slice(0, 120);
      state.awaitingLocation = false;
      state.handedOff = true;
      return buildReply(
        state,
        `Thanks. I have a draft for ${formatCategoryLabel(state.category)} work in ${state.locationText}. Please review the description, category, locality and urgency yourself in the booking form — I won’t post or book anything for you.`,
        'HANDOFF_TO_BOOKING',
        confidenceFor(2),
        false,
      );
    }
    updateDescription(state, message);
  } else {
    updateDescription(state, message);
  }

  if (!state.description) {
    return buildReply(state, clarifyQuestion(), 'ASK_QUESTION', null, true);
  }

  const classification = classificationFromDescription(state.description);
  if (classification.category) {
    state.category = classification.category;
  }

  // If the user typed a clear category word in this turn, prefer it.
  const current = scoreDescription(message);
  if (current.length > 0) {
    const candidate = current[0];
    if (confidenceFor(candidate.score) >= 0.62) state.category = candidate.category;
  }

  if (!state.category) {
    return buildReply(
      state,
      classification.clarifyingQuestion ?? clarifyQuestion(),
      'ASK_QUESTION',
      classification.confidence,
      true,
    );
  }

  if (!state.locationText) {
    state.awaitingLocation = true;
    return buildReply(
      state,
      `This sounds like ${formatCategoryLabel(state.category).toLowerCase()} work. Which locality should the worker visit?${state.urgency === 'emergency' ? ' Please only continue once everyone is safe.' : ''}`,
      'SUGGEST_CATEGORY',
      classification.confidence ?? confidenceFor(2),
      true,
    );
  }

  const alreadyHandedOff = state.handedOff;
  state.handedOff = true;
  return buildReply(
    state,
    alreadyHandedOff
      ? 'These details are ready in the booking form. I can only suggest and clarify — you must review and confirm the request yourself. I cannot submit, accept or book a job.'
      : `I have enough for the booking form: ${formatCategoryLabel(state.category)} in ${state.locationText}. Please review the description, category, locality and urgency before confirming. I won’t post or book anything for you.`,
    'HANDOFF_TO_BOOKING',
    classification.confidence ?? confidenceFor(2),
    false,
  );
}

export function mockClassify(description: string): ClassificationResult {
  return classificationFromDescription(description);
}
