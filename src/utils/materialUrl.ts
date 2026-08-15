const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/$/, '');

export function materialContentUrl(materialId: string, mode: 'inline' | 'attachment' = 'inline') {
  return `${API_URL}/materials/${encodeURIComponent(materialId)}/content?mode=${mode}`;
}
