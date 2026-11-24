/** Thrown by stub engine functions until the matching ticket is implemented. */
export function notImplemented(name: string): never {
  throw new Error(
    `Not implemented: ${name}. Implement the matching ticket in docs/tickets/ (see docs/LOCAL_AI_GUIDE.md).`,
  );
}
