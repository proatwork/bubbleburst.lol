import { StatusSchema, type Status } from './schema.ts';

export const CONTENT_PATH = 'content/status.json';

export class StatusValidationError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`${CONTENT_PATH} is invalid:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    this.name = 'StatusValidationError';
    this.problems = problems;
  }
}

/** Parses raw JSON into a Status, or throws a StatusValidationError listing every problem. */
export function parseStatus(raw: unknown): Status {
  const result = StatusSchema.safeParse(raw);
  if (result.success) return result.data;
  const problems = result.error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.map(String).join('.') : '(root)';
    return `${path}: ${issue.message}`;
  });
  throw new StatusValidationError(problems);
}
