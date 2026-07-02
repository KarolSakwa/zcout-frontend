export type HomepagePlayerNameLines = {
  firstLine: string;
  secondLine: string | null;
  longestLineLength: number;
  fontSizePx: number;
};

const SHORT_LINE_MAX = 7;
const MEDIUM_LINE_LENGTH = 9;

export function splitPlayerNameLines(name: string): Pick<
  HomepagePlayerNameLines,
  'firstLine' | 'secondLine' | 'longestLineLength'
> {
  const normalized = String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

  if (!normalized) {
    return { firstLine: '', secondLine: null, longestLineLength: 0 };
  }

  const parts = normalized.split(' ');

  if (parts.length < 2) {
    return {
      firstLine: normalized,
      secondLine: null,
      longestLineLength: normalized.length,
    };
  }

  const firstLine = parts[0];
  const secondLine = parts.slice(1).join(' ');
  const longestLineLength = Math.max(firstLine.length, secondLine.length);

  return { firstLine, secondLine, longestLineLength };
}

export function getHomepageNameFontSize(longestLineLength: number): number {
  if (longestLineLength <= SHORT_LINE_MAX) return 10;
  if (longestLineLength === MEDIUM_LINE_LENGTH) return 9;
  return 8;
}

export function getHomepagePlayerNameDisplay(name: string): HomepagePlayerNameLines {
  const { firstLine, secondLine, longestLineLength } = splitPlayerNameLines(name);

  return {
    firstLine,
    secondLine,
    longestLineLength,
    fontSizePx: getHomepageNameFontSize(longestLineLength),
  };
}
