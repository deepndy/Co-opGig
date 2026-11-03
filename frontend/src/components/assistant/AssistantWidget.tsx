import { ArrowRight, Bot, MessageCircle, Minus, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getErrorMessage, isDemoMode } from '../../api';
import { AI_ASSISTANT, BRAND } from '../../config/brand';
import { formatCategoryLabel } from '../../config/serviceCategories';
import type { AssistantReply } from '../../types/api';
import { confidenceText } from '../../utils/format';
import { OPEN_ASSISTANT_EVENT } from './assistantEvents';

const SESSION_KEY = 'coopgig.assistant.sessionId';
const MAX_MESSAGE_LENGTH = BRAND.maxChatMessageLength;

const WELCOME_TEXT =
  'Hi! I’m the Co-opGig assistant. Tell me what needs fixing — for example, “water is leaking under the kitchen sink”. I can suggest a service category and help prepare booking details, but I never book or accept a job for you.';

const QUICK_PROMPTS = ['My kitchen tap is leaking', 'A light stopped working', 'I need help with home cleaning'];

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
}

interface Suggestion {
  category: string;
  confidence: number | null;
  description: string | null;
  locationText: string | null;
  urgency: string | null;
}

function messageId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readSessionId(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function writeSessionId(sessionId: string | null): void {
  try {
    if (sessionId) window.sessionStorage.setItem(SESSION_KEY, sessionId);
    else window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Session storage may be unavailable; the conversation still works in-memory.
  }
}

function welcomeMessage(): ChatMessage {
  return { id: 'welcome', role: 'assistant', text: WELCOME_TEXT };
}

/**
 * The ONLY floating assistant in the application. Mounted once at the app
 * root. It never creates a job or changes job status; it only calls the core
 * backend's assistant proxy and hands details to the booking form for review.
 */
export function AssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage()]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const sessionIdRef = useRef<string | null>(readSessionId());
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleOpen() {
      setIsOpen(true);
    }
    window.addEventListener(OPEN_ASSISTANT_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const node = endRef.current;
    if (node && typeof node.scrollIntoView === 'function') {
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      node.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'end' });
    }
  }, [messages, isSending, error, isOpen]);

  function closePanel() {
    setIsOpen(false);
    bubbleRef.current?.focus();
  }

  function applyReply(reply: AssistantReply, fallbackDescription: string) {
    if (reply.sessionId) {
      sessionIdRef.current = reply.sessionId;
      writeSessionId(reply.sessionId);
    }
    setMessages((current) => [
      ...current,
      { id: messageId(), role: 'assistant', text: reply.reply },
    ]);
    if (reply.suggestedCategory) {
      setSuggestion({
        category: reply.suggestedCategory,
        confidence: reply.confidence,
        description: reply.extractedFields?.description ?? fallbackDescription,
        locationText: reply.extractedFields?.locationText ?? null,
        urgency: reply.extractedFields?.urgency ?? null,
      });
    }
  }

  async function requestReply(text: string, fallbackDescription: string) {
    setIsSending(true);
    setError(null);
    try {
      const reply = await api.assistantChat({
        sessionId: sessionIdRef.current,
        message: text,
        jobContext: {
          category: suggestion?.category ?? null,
          locationText: suggestion?.locationText ?? null,
        },
        locale: BRAND.locale,
      });
      applyReply(reply, fallbackDescription);
      setLastFailedMessage(null);
    } catch (requestError) {
      setError(requestError);
      setLastFailedMessage(text);
    } finally {
      setIsSending(false);
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    if (trimmed.length > MAX_MESSAGE_LENGTH) return;
    setMessages((current) => [
      ...current,
      { id: messageId(), role: 'user', text: trimmed },
    ]);
    setInput('');
    await requestReply(trimmed, trimmed);
  }

  async function retry() {
    if (!lastFailedMessage || isSending) return;
    await requestReply(lastFailedMessage, lastFailedMessage);
  }

  function resetConversation() {
    setMessages([welcomeMessage()]);
    setSuggestion(null);
    setError(null);
    setLastFailedMessage(null);
    setInput('');
    sessionIdRef.current = null;
    writeSessionId(null);
    inputRef.current?.focus();
  }

  function reviewInBooking() {
    if (!suggestion) return;
    const params = new URLSearchParams();
    params.set('category', suggestion.category);
    params.set('source', 'assistant');
    if (suggestion.description) params.set('description', suggestion.description.slice(0, 1200));
    if (suggestion.locationText) params.set('location', suggestion.locationText);
    if (suggestion.urgency === 'urgent' || suggestion.urgency === 'emergency' || suggestion.urgency === 'normal') {
      params.set('urgency', suggestion.urgency);
    }
    setIsOpen(false);
    navigate(`/book?${params.toString()}`);
  }

  const remaining = MAX_MESSAGE_LENGTH - input.length;
  const showQuickPrompts = messages.length === 1 && !isSending && !error;

  return (
    <div className={isOpen ? 'cg-assistant is-open' : 'cg-assistant'}>
      {isOpen ? (
        <section
          id="coopgig-assistant-panel"
          className="cg-assistant__panel"
          role="dialog"
          aria-label="Co-opGig assistant chat"
          aria-modal="false"
          onKeyDown={(event) => {
            if (event.key === 'Escape') closePanel();
          }}
        >
          <header className="cg-assistant__header">
            <span className="cg-assistant__avatar" aria-hidden="true">
              <Bot size={20} />
            </span>
            <div className="cg-assistant__title">
              <h2>{AI_ASSISTANT.title}</h2>
              <p>{AI_ASSISTANT.subtitle}</p>
            </div>
            <button
              type="button"
              className="cg-assistant__icon-button"
              onClick={resetConversation}
              aria-label="Start a new conversation"
              title="Start a new conversation"
              disabled={isSending}
            >
              <RotateCcw size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="cg-assistant__icon-button"
              onClick={closePanel}
              aria-label={AI_ASSISTANT.minimizeLabel}
              title="Minimize assistant"
            >
              <Minus size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="cg-assistant__messages" role="log" aria-live="polite" aria-relevant="additions text">
            {messages.map((message) => (
              <div key={message.id} className={`cg-assistant__message cg-assistant__message--${message.role}`}>
                {message.role === 'assistant' ? (
                  <span className="cg-assistant__mini-avatar" aria-hidden="true">
                    <Sparkles size={12} />
                  </span>
                ) : null}
                <div className="cg-assistant__bubble">
                  <p>{message.text}</p>
                </div>
              </div>
            ))}

            {showQuickPrompts ? (
              <div className="cg-assistant__quick-prompts" aria-label="Example questions">
                {QUICK_PROMPTS.map((prompt) => (
                  <button type="button" key={prompt} onClick={() => void send(prompt)} disabled={isSending}>
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}

            {isSending ? (
              <div className="cg-assistant__message cg-assistant__message--assistant">
                <span className="cg-assistant__mini-avatar" aria-hidden="true">
                  <Sparkles size={12} />
                </span>
                <div className="cg-assistant__bubble cg-assistant__bubble--typing" role="status">
                  <span className="cg-typing" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className="visually-hidden">Assistant is replying…</span>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="cg-assistant__error" role="alert">
                <p>Could not reach the assistant. {getErrorMessage(error)}</p>
                <button type="button" onClick={() => void retry()} disabled={isSending || !lastFailedMessage}>
                  Try again
                </button>
              </div>
            ) : null}

            {suggestion ? (
              <div className="cg-assistant__suggestion">
                <div className="cg-assistant__suggestion-head">
                  <div>
                    <span>Suggested category</span>
                    <strong>{formatCategoryLabel(suggestion.category)}</strong>
                  </div>
                  {confidenceText(suggestion.confidence) ? (
                    <span className="cg-assistant__confidence">
                      {confidenceText(suggestion.confidence)}
                      {isDemoMode ? ' demo' : ''} confidence
                    </span>
                  ) : null}
                </div>
                <p>
                  {isDemoMode
                    ? 'Demo keyword suggestion — not a trained-model score. '
                    : 'Suggestion only. '}
                  Review and confirm everything in the booking form.
                </p>
                <button type="button" className="cg-assistant__review-button" onClick={reviewInBooking}>
                  Review in booking form
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            ) : null}

            <div ref={endRef} />
          </div>

          <form
            className="cg-assistant__composer"
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
          >
            <label className="visually-hidden" htmlFor="assistant-message">
              Message to the Co-opGig assistant
            </label>
            <textarea
              id="assistant-message"
              ref={inputRef}
              rows={1}
              maxLength={MAX_MESSAGE_LENGTH}
              value={input}
              disabled={isSending}
              placeholder="Describe what needs fixing…"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  void send(input);
                }
              }}
            />
            <button
              type="submit"
              className="cg-assistant__send"
              aria-label="Send message"
              disabled={isSending || !input.trim()}
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </form>

          <div className="cg-assistant__footer">
            <p>
              {isDemoMode
                ? 'Demo assistant: canned keyword replies, no AI model or booking.'
                : 'Suggestions only. The assistant never books or accepts jobs.'}{' '}
              For emergencies, contact local emergency services.
            </p>
            {remaining < 300 ? (
              <span className="cg-assistant__counter" aria-hidden="true">
                {remaining} characters left · Enter to send · Shift+Enter for a new line
              </span>
            ) : (
              <span className="cg-assistant__counter" aria-hidden="true">
                Enter to send · Shift+Enter for a new line
              </span>
            )}
          </div>
        </section>
      ) : null}

      <div className="cg-assistant__bubble-wrap">
        {!isOpen ? (
          <span className="cg-assistant__tooltip" aria-hidden="true">
            {AI_ASSISTANT.tooltip}
          </span>
        ) : null}
        <button
          type="button"
          ref={bubbleRef}
          className="cg-assistant__launcher"
          aria-label={isOpen ? 'Close Co-opGig assistant' : AI_ASSISTANT.openLabel}
          aria-expanded={isOpen}
          aria-controls="coopgig-assistant-panel"
          onClick={() => (isOpen ? closePanel() : setIsOpen(true))}
        >
          {isOpen ? (
            <X size={24} aria-hidden="true" />
          ) : (
            <MessageCircle size={25} aria-hidden="true" />
          )}
          {!isOpen ? <span className="cg-assistant__spark" aria-hidden="true">✦</span> : null}
        </button>
      </div>
    </div>
  );
}
