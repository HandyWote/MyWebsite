export function normalizeDisplayMath(markdown = '') {
  if (!markdown || !markdown.includes('$$')) {
    return markdown;
  }

  let fenceMarkerChar = '';
  let fenceMarkerLength = 0;

  return markdown
    .split('\n')
    .map((line) => {
      const fenceMatch = line.match(/^\s{0,3}([`~]{3,})/);
      if (fenceMatch) {
        const marker = fenceMatch[1];
        const markerChar = marker[0];
        const markerLength = marker.length;

        if (!fenceMarkerChar) {
          fenceMarkerChar = markerChar;
          fenceMarkerLength = markerLength;
          return line;
        }

        if (markerChar === fenceMarkerChar && markerLength >= fenceMarkerLength) {
          fenceMarkerChar = '';
          fenceMarkerLength = 0;
        }
        return line;
      }

      if (fenceMarkerChar) {
        return line;
      }

      // 跳过缩进代码块行
      if (/^(?:\t| {4,})/.test(line)) {
        return line;
      }

      const match = line.match(/^\s*\$\$(?!\s*$)(.*?)\$\$\s*$/);
      if (!match) {
        return line;
      }

      const expression = (match[1] || '').trim();
      if (!expression) {
        return line;
      }

      return `$$\n${expression}\n$$`;
    })
    .join('\n');
}
