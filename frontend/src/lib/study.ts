import type { StudyMode, StudyState } from './api';

export const modeLabels: Record<StudyMode, string> = {
  choice: '选择题',
  spelling: '拼写单词',
  meaning: '看英文输中文',
};

export const modePrompts: Record<StudyMode, string> = {
  choice: '选出与中文释义对应的英文单词',
  spelling: '写出与中文释义对应的英文单词',
  meaning: '写出这个英文单词的中文释义',
};

export const modeHints: Record<StudyMode, string> = {
  choice: '四个选项里选出正确的英文，适合快速过词。',
  spelling: '看中文释义拼出英文，最能检验记忆。',
  meaning: '看英文写出任意一条中文释义即可。',
};

/** 安全地计算百分比：分母为 0 时返回 0，避免出现 NaN。 */
export function percentage(part: number, total: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((part / total) * 100)));
}

/**
 * 以已完成题目计算学习进度；当前题答对后计入，整轮完成时为 100%。
 */
export function studyProgress(
  state: Pick<StudyState, 'currentIndex' | 'totalCount' | 'canAdvance' | 'finished'>,
): number {
  if (state.finished) return 100;
  return percentage(state.currentIndex + (state.canAdvance ? 1 : 0), state.totalCount);
}

/** 完成一轮后后端的 currentIndex 等于总数，显示题号时需要截断。 */
export function questionNumber(state: Pick<StudyState, 'currentIndex' | 'totalCount'>): number {
  return Math.min(state.currentIndex + 1, state.totalCount);
}

/** 把后端返回的 UTC 时间格式化为上海时区的“MM-DD HH:mm”。 */
export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/** 上海时区的今天，格式与后端打卡日期（YYYY-MM-DD）一致。 */
export function todayInShanghai(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 把 2026-11-17 显示为 11-17，用于紧凑的打卡标签。 */
export function shortDate(value: string): string {
  return value.slice(5).replace('-', '/');
}
