// apps/web/lib/api.ts
export async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
