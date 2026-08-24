/**
 * Content Moderation and Safety Engine
 * Validates text content to block explicit sexual content, pornographic material,
 * malicious spam, and prohibited promotional patterns.
 */

// Category-based keyword patterns (case-insensitive)
const INAPPROPRIATE_PATTERNS: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /\b(porn|pornography|pornhub|xvideos|xnxx|hentai|nsfw|erotic|xxx|sex video|camgirl|onlyfans)\b/i,
    reason: 'Explicit sexual or pornographic content is not permitted.',
  },
  {
    pattern: /\b(free crypto|free bitcoin|t\.me\/|wa\.me\/|bit\.ly\/|whatsapp \+\d+|telegram @\w+|dm me for \w+|buy followers)\b/i,
    reason: 'Spam, external promotional links, and unauthorized advertising are not allowed.',
  },
  {
    pattern: /\b(viagra|cialis|casino|betting|slot machine|online bet)\b/i,
    reason: 'Commercial solicitations and gambling promotions are prohibited.',
  },
  {
    pattern: /\b(nigger|faggot|chink|kike|retard)\b/i,
    reason: 'Hate speech and harassment are strictly prohibited.',
  },
];

export type ModerationResult = {
  isSafe: boolean;
  reason?: string;
  matches?: string[];
  sanitizedText: string;
};

/**
 * Validates text against community guidelines and moderation rules
 */
export function moderateContent(text: string): ModerationResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { isSafe: true, sanitizedText: '' };
  }

  for (const rule of INAPPROPRIATE_PATTERNS) {
    if (rule.pattern.test(trimmed)) {
      return {
        isSafe: false,
        reason: rule.reason,
        sanitizedText: trimmed,
      };
    }
  }

  // Basic HTML/script tag stripping for output safety
  const sanitized = trimmed
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '');

  return {
    isSafe: true,
    sanitizedText: sanitized,
  };
}
