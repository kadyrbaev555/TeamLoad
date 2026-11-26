// Client mirrors of the server rules (instant feedback; the server decides).
import { addDaysISO, todayISO } from "./format";

export const MSG = {
  noConsent: "Please accept personal-data processing to continue",
  fullName: "Enter your full name (2–100 characters).",
  email: "Enter a valid email address.",
  password: "Use at least 8 characters.",
  title: "Add a project title.",
  descShort: "The description needs at least 100 characters so the AI can understand the project.",
  deadlineMin: "Set a deadline at least 7 days from today.",
  deadlinePast: "The deadline cannot be in the past.",
  profileShort: "Write at least 30 characters for strengths and 10 for weaknesses.",
  tooManyTags: "Use at most 10 tags.",
  tagLength: "Each tag must be 1–24 characters.",
  estimateRequired: "Enter an estimate greater than 0 hours",
  estimateRange: "Estimate must be between 0.5 and 40 hours.",
  taskTitle: "Give the task a title.",
  aiUnavailable: "AI service temporarily unavailable. Please retry or assign roles manually",
  seatResp: "Give every role 3–5 responsibilities, each up to 80 characters.",
} as const;

export function validEmail(s: string): boolean {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s.trim());
}

export type Errors = Record<string, string>;

export function validateRegistration(v: { full_name: string; email: string; password: string; consent: boolean }): Errors {
  const e: Errors = {};
  const n = v.full_name.trim().length;
  if (n < 2 || n > 100) e.full_name = MSG.fullName;
  if (!validEmail(v.email)) e.email = MSG.email;
  if (v.password.length < 8) e.password = MSG.password;
  if (!v.consent) e.consent = MSG.noConsent;
  return e;
}

/** Returns the first problem with a new-project form, in design order. */
export function validateNewProject(v: { title: string; description: string; deadline: string }, now = new Date()): string | null {
  if (!v.title.trim()) return MSG.title;
  if (v.description.trim().length < 100) return MSG.descShort;
  if (!v.deadline || v.deadline < addDaysISO(todayISO(now), 7)) return MSG.deadlineMin;
  return null;
}

export const MIN_STRENGTHS = 30;
export const MIN_WEAKNESSES = 10;

export function profileCharacterCount(value: string): number {
  return Array.from(value.trim()).length;
}

export function profileProblem(strengths: string, weaknesses: string): string | null {
  const s = profileCharacterCount(strengths);
  const w = profileCharacterCount(weaknesses);
  return s < MIN_STRENGTHS || w < MIN_WEAKNESSES ? MSG.profileShort : null;
}

/** Validates an estimate field; returns [hours rounded to 0.5, error]. */
export function checkEstimate(raw: string): [number, string | null] {
  const h = raw.trim() === "" ? NaN : Number(raw);
  if (!Number.isFinite(h) || h <= 0) return [0, MSG.estimateRequired];
  if (h < 0.5 || h > 40) return [0, MSG.estimateRange];
  return [Math.round(h * 2) / 2, null];
}

export const MIN_RESPONSIBILITIES = 3;
export const MAX_RESPONSIBILITIES = 5;
export const MAX_RESPONSIBILITY_LENGTH = 80;

/** Mirrors the server rule: 3–5 unique, non-empty items of up to 80 characters. */
export function responsibilitiesProblem(items: string[]): string | null {
  if (items.length < MIN_RESPONSIBILITIES || items.length > MAX_RESPONSIBILITIES) return MSG.seatResp;
  const seen = new Set<string>();
  for (const it of items) {
    const t = it.trim();
    const n = Array.from(t).length;
    if (n < 1 || n > MAX_RESPONSIBILITY_LENGTH || seen.has(t.toLowerCase())) return MSG.seatResp;
    seen.add(t.toLowerCase());
  }
  return null;
}
