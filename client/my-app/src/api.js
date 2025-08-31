const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const USER_ID  = import.meta.env.VITE_USER_ID  || "dev-1";

async function asArray(res) {
  const data = await res.json().catch(()=>[]);
  if (Array.isArray(data)) return data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  return [];
}

export async function fetchBooks(params = {}) {
  const url = new URL(`${API_BASE}/books`);
  Object.entries(params).forEach(([k,v]) => v!==undefined && url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { "Accept":"application/json" } });
  if (!res.ok) throw new Error(`Failed to fetch books (${res.status})`);
  return asArray(res);
}

export async function fetchMyLoans() {
  const res = await fetch(`${API_BASE}/loans/my`, {
    headers: { "Accept":"application/json", "x-user-id": USER_ID },
  });
  if (!res.ok) throw new Error(`Failed to fetch loans (${res.status})`);
  return asArray(res);
}

export async function fetchTopBooks() {
  const res = await fetch(`${API_BASE}/stats/top-books`, {
    headers: { "Accept":"application/json" },
  });
  if (!res.ok) throw new Error(`Failed to fetch top-books (${res.status})`);
  return asArray(res);
}
