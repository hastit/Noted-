type LegacyBlock = {
  type?: string;
  content?: string;
};

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function stripHtml(html: string): string {
  if (!html) return '';
  if (typeof document !== 'undefined') {
    const el = document.createElement('div');
    el.innerHTML = html;
    return normalizeWhitespace(el.textContent ?? '');
  }
  return normalizeWhitespace(
    html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>'),
  );
}

function cleanPlainText(text: string): string {
  return normalizeWhitespace(text.replace(/^["']+|["']+$/g, ''));
}

function looksLikeLegacyJson(raw: string): boolean {
  const s = raw.trim();
  return s.startsWith('[') && s.includes('"type"');
}

function firstParagraphFromPlain(text: string): string {
  const trimmed = text.trim();
  if (!trimmed || looksLikeLegacyJson(trimmed)) return '';
  const paragraph = trimmed.split(/\n\s*\n/)[0] ?? trimmed;
  return cleanPlainText((paragraph.split('\n')[0] ?? paragraph).trim());
}

function firstParagraphFromHtml(html: string): string {
  const pMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (pMatch) {
    const text = stripHtml(pMatch[1]);
    if (text) return text;
  }
  const headingMatch = html.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
  if (headingMatch) {
    const text = stripHtml(headingMatch[1]);
    if (text) return text;
  }
  const liMatch = html.match(/<li[^>]*>([\s\S]*?)<\/li>/i);
  if (liMatch) {
    const text = stripHtml(liMatch[1]);
    if (text) return text;
  }
  return stripHtml(html);
}

const TEXT_LEGACY_TYPES = new Set(['text', 'h1', 'h2', 'h3', 'bullet', 'number', 'todo', 'toggle']);

function firstParagraphFromLegacyBlocks(blocks: LegacyBlock[]): string {
  for (const block of blocks) {
    if (!block?.type || block.type === 'image') continue;
    if (!TEXT_LEGACY_TYPES.has(block.type)) continue;
    const raw = block.content ?? '';
    const text = cleanPlainText(raw.includes('<') ? stripHtml(raw) : raw);
    if (text) return text;
  }
  return '';
}

function legacyPreviewFallback(blocks: LegacyBlock[]): string {
  const hasImage = blocks.some(b => b.type === 'image');
  if (hasImage) return 'Image';
  return '';
}

function htmlPreviewFallback(html: string): string {
  if (/<img\b/i.test(html)) return 'Image';
  return '';
}

/** Extract readable plain text from note content (HTML, legacy JSON blocks, or plain text). */
export function extractPlainFromNoteContent(raw: string): string {
  if (!raw?.trim()) return '';

  const trimmed = raw.trim();

  if (looksLikeLegacyJson(trimmed)) {
    try {
      const parsed = JSON.parse(trimmed) as LegacyBlock[];
      if (Array.isArray(parsed)) {
        return firstParagraphFromLegacyBlocks(parsed) || legacyPreviewFallback(parsed);
      }
    } catch {
      if (/"type"\s*:\s*"image"/i.test(trimmed)) return 'Image';
      return '';
    }
    return '';
  }

  if (trimmed.startsWith('<')) {
    const text = firstParagraphFromHtml(trimmed);
    return text || htmlPreviewFallback(trimmed);
  }

  return firstParagraphFromPlain(trimmed);
}

export function plainTextToNoteHtml(plain: string): string {
  if (!plain.trim()) return '';
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return plain
    .split('\n')
    .map(line => `<p>${escape(line) || '<br>'}</p>`)
    .join('');
}

function allTextFromLegacyBlocks(blocks: LegacyBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if (!block?.type || block.type === 'image') continue;
    if (!TEXT_LEGACY_TYPES.has(block.type)) continue;
    const raw = block.content ?? '';
    const text = cleanPlainText(raw.includes('<') ? stripHtml(raw) : raw);
    if (text) parts.push(text);
  }
  return parts.join('\n\n');
}

/** Full plain-text body for moves / exports (not just first paragraph). */
export function noteContentToPlainFull(raw: string): string {
  if (!raw?.trim()) return '';

  const trimmed = raw.trim();

  if (looksLikeLegacyJson(trimmed)) {
    try {
      const parsed = JSON.parse(trimmed) as LegacyBlock[];
      if (Array.isArray(parsed)) {
        const text = allTextFromLegacyBlocks(parsed);
        if (text) return text;
        return '';
      }
    } catch {
      return '';
    }
    return '';
  }

  if (trimmed.startsWith('<')) {
    return stripHtml(trimmed);
  }

  if (looksLikeLegacyJson(trimmed)) return '';
  return trimmed;
}

const PREVIEW_MAX = 120;

/** Single-line preview for note list rows — first paragraph only. */
export function noteListPreview(content: string): string {
  const text = extractPlainFromNoteContent(content);
  if (!text) return 'No additional text';
  if (text.length <= PREVIEW_MAX) return text;
  return `${text.slice(0, PREVIEW_MAX).trimEnd()}…`;
}
