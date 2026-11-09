export interface Wordbook {
  id: number;
  name: string;
  wordCount: number;
  isDemo: boolean;
}

export interface Word {
  id: number;
  english: string;
  partOfSpeech: string;
  meanings: string[];
}

export type StudyMode = 'choice' | 'spelling';

export interface StudyState {
  mode: StudyMode;
  score: number;
  correctCount: number;
  totalCount: number;
  currentIndex: number;
  wrongCount: number;
  finished: boolean;
  canAdvance: boolean;
  question: {
    wordId: number;
    partOfSpeech: string;
    meanings: string[];
    choices: string[];
  } | null;
  result?: {
    correct: boolean;
    firstAttempt: boolean;
    scoreDelta: number;
    message: string;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

/** 使用同源 Cookie 访问 Drogon API，非成功响应统一抛出可展示的错误。 */
async function request<T>(path: string, data?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: data === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: data === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new ApiError(result.error ?? `请求失败：${response.status}`, response.status);
  }
  return result as T;
}

export const api = {
  health: () => request<{ status: string; mode: string; framework: string }>('/health'),
  wordbooks: () => request<{ items: Wordbook[] }>('/wordbooks'),
  words: (id: number) => request<{ items: Word[] }>(`/wordbooks/${id}/words`),
  study: () => request<StudyState>('/study'),
  start: (wordbookId: number, mode: StudyMode) =>
    request<StudyState>('/study/start', { wordbookId, mode }),
  answer: (answer: string) => request<StudyState>('/study/answer', { answer }),
  next: () => request<StudyState>('/study/next', {}),
  review: () => request<StudyState>('/study/review', {}),
};
