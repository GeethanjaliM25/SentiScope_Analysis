export type ParsedCsv = { headers: string[]; rows: string[][] };

/** Minimal RFC4180-ish CSV parser (handles quotes, escaped quotes, CRLF). */
export function parseCsv(input: string): ParsedCsv {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);

  const [headers = [], ...body] = rows;
  return { headers: headers.map((h) => h.trim()), rows: body };
}

export function guessTextColumn(headers: string[], rows: string[][]): number {
  const preferred = ["text", "tweet", "content", "message", "review", "comment", "body"];
  const byName = headers.findIndex((h) => preferred.includes(h.toLowerCase().trim()));
  if (byName >= 0) return byName;

  let best = 0;
  let bestLength = -1;
  headers.forEach((_, index) => {
    const sample = rows.slice(0, 25).map((r) => (r[index] ?? "").length);
    const avg = sample.length ? sample.reduce((a, b) => a + b, 0) / sample.length : 0;
    if (avg > bestLength) {
      bestLength = avg;
      best = index;
    }
  });
  return best;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (value: string | number) => {
    const str = String(value ?? "");
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  return [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
}
