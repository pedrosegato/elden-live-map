async function request(method: string, path: string): Promise<Response> {
  const response = await fetch(path, { method });
  if (!response.ok) {
    throw new Error(`${method} ${path} → ${response.status}`);
  }
  return response;
}

export async function fetchFound(): Promise<Set<number>> {
  const response = await request("GET", "/api/progress");
  const progress = (await response.json()) as { found: number[] };
  return new Set(progress.found);
}

export async function saveFound(locationId: number, isFound: boolean): Promise<void> {
  await request(isFound ? "PUT" : "DELETE", `/api/progress/found/${locationId}`);
}
