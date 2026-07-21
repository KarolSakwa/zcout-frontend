export type HomepagePlayerNameLines = {
  firstLine: string;
  secondLine: string | null;
  thirdLine: string | null;
  longestLineLength: number;
  fontSizePx: number;
};

const SHORT_LINE_MAX = 7;
const MEDIUM_LINE_LENGTH = 9;

export function splitPlayerNameLines(
  name: string,
  maxLines = 2,
): Pick<HomepagePlayerNameLines, 'firstLine' | 'secondLine' | 'thirdLine' | 'longestLineLength'> {
  const normalized = String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

  if (!normalized) {
    return { firstLine: '', secondLine: null, thirdLine: null, longestLineLength: 0 };
  }

  const parts = normalized.split(' ');

  if (parts.length < 2) {
    return {
      firstLine: normalized,
      secondLine: null,
      thirdLine: null,
      longestLineLength: normalized.length,
    };
  }

  if (maxLines <= 2 || parts.length === 2) {
    const firstLine = parts[0];
    const secondLine = parts.slice(1).join(' ');
    return {
      firstLine,
      secondLine,
      thirdLine: null,
      longestLineLength: Math.max(firstLine.length, secondLine.length),
    };
  }

  if (parts.length === 3) {
    const [firstLine, secondLine, thirdLine] = parts;
    return {
      firstLine,
      secondLine,
      thirdLine,
      longestLineLength: Math.max(firstLine.length, secondLine.length, thirdLine.length),
    };
  }

  const firstLine = parts[0];
  const thirdLine = parts[parts.length - 1];
  const secondLine = parts.slice(1, -1).join(' ');
  return {
    firstLine,
    secondLine,
    thirdLine,
    longestLineLength: Math.max(firstLine.length, secondLine.length, thirdLine.length),
  };
}

export function getHomepageNameFontSize(
  longestLineLength: number,
  narrowMobile = false,
): number {
  if (narrowMobile) {
    if (longestLineLength <= SHORT_LINE_MAX) return 12;
    if (longestLineLength <= MEDIUM_LINE_LENGTH) return 11;
    if (longestLineLength <= 12) return 10;
    return 9;
  }

  if (longestLineLength <= SHORT_LINE_MAX) return 10;
  if (longestLineLength === MEDIUM_LINE_LENGTH) return 9;
  return 8;
}

export function getHomepagePlayerNameDisplay(
  name: string,
  options: { maxLines?: number; narrowMobile?: boolean } = {},
): HomepagePlayerNameLines {
  const maxLines = options.maxLines ?? 2;
  const narrowMobile = options.narrowMobile ?? false;
  const { firstLine, secondLine, thirdLine, longestLineLength } = splitPlayerNameLines(
    name,
    maxLines,
  );

  return {
    firstLine,
    secondLine,
    thirdLine,
    longestLineLength,
    fontSizePx: getHomepageNameFontSize(longestLineLength, narrowMobile),
  };
}
