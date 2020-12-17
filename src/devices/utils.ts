export type ValueOf<T> = T[keyof T];

export async function mapSeries<U, T>(
  args: U[],
  action: (arg: U) => Promise<T>,
): Promise<T[]> {
  const results = [];
  for (const arg of args) {
    results.push(await action(arg));
  }

  return results;
}
