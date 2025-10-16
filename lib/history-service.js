"use client";

export const HISTORY_KEY = "mermaidHistory";

export function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY) || "[]";
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addHistoryEntry(entry) {
  const list = getHistory();
  const withMeta = {
    ...entry,
    id: String(Date.now()),
    createdAt: new Date().toISOString()
  };
  const next = [withMeta, ...list];
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function deleteHistoryEntry(id) {
  const next = getHistory().filter(e => e.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function clearHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
}


