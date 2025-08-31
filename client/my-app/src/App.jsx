
import React, { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

// ===== Helpers (שימי למעלה בקובץ) =====
function daysLeft(dueAt) {
  if (!dueAt) return 0;
  const ms = new Date(dueAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000)); // 86400000 = יום במילישניות
}

function fmtDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString(); }
  catch { return ""; }
}

// ====== קונפיג לקוח ======
const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";
const USER_ID  = import.meta.env.VITE_USER_ID  ?? "dev-1";

// עוטף fetch שמוסיף תמיד x-user-id
function apiFetch(input, opts = {}) {
  const url = typeof input === "string" ? new URL(input, API_BASE) : input;
  const headers = new Headers(opts.headers || {});
  headers.set("x-user-id", USER_ID);
  headers.set("Accept", "application/json");
  return fetch(url, { ...opts, headers });
}


// מנרמל כל תשובה לחתיכת מערך
async function toArray(res) {
  const data = await res.json().catch(() => []);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows))  return data.rows;
  if (Array.isArray(data?.data))  return data.data;
  // אם זה אובייקט של ספר בודד — נחזיר כמערך של איבר יחיד
  if (data && typeof data === "object" && (data.title || data.book?.title)) return [data];
  return [];
}

// עטיפת קריאה בטוחה שמחזירה [] על 404/שגיאה, כדי שהמסך לא יישבר
async function safeFetchArray(pathOrUrl, opts) {
  try {
    const r = await apiFetch(pathOrUrl, opts);
    if (r.status === 404) {
      console.warn("[safeFetchArray] 404 for", pathOrUrl);
      return [];
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const arr = await toArray(r);
    console.log("[safeFetchArray]", pathOrUrl, "->", arr);
    return arr;
  } catch (e) {
    console.warn("[safeFetchArray] failed", pathOrUrl, e);
    return [];
  }
}

// ====== קריאות API ======
async function fetchBooks({ search, sort, onlyAvailable }) {
  const u = new URL("/books", API_BASE);
  if (search) u.searchParams.set("search", search);
  if (sort) u.searchParams.set("sort", sort);
  if (onlyAvailable) u.searchParams.set("onlyAvailable", "true");
  // אם /books עובד בדפדפן — זה יחזיר מערך
  return safeFetchArray(u);
}

async function apiBorrow(bookId) {
  const r = await apiFetch("/loans/borrow", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookId }),
  });
  if (r.status === 409) { const e = new Error("Book is not available"); e.status = 409; throw e; }
  if (!r.ok) throw new Error(`Failed to borrow (${r.status})`);
  return r.json();
}

async function apiReturn(loanId) {
  const r = await apiFetch("/loans/return", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loanId }),
  });
  if (!r.ok) throw new Error(`Failed to return (${r.status})`);
  return r.json();
}

async function apiFetchMyLoans() {
  // אם אין ראוט כזה בשרת עדיין – זה יחזור [] ולא יפיל את המסך
  return safeFetchArray("/loans/my");
}

async function apiFetchTop() {
  // אם אין /stats/top-books כרגע – גם פה נחזור []
  return safeFetchArray("/stats/top-books");
}

// ====== קומפוננטה ======
export default function App() {
const [showHistory, setShowHistory] = useState(false);
  const [tab, setTab] = useState("library");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("title");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [books, setBooks] = useState([]);
  const [loans, setLoans] = useState([]);
  const [top, setTop] = useState([]);

  // טוען נתונים
  async function loadAll() {
    setBusy(true);
    setError("");
    console.log("API_BASE=", API_BASE, "USER_ID=", USER_ID);
    try {
      const [b, l, t] = await Promise.all([
        fetchBooks({ search, sort, onlyAvailable }),
        apiFetchMyLoans(),
        apiFetchTop(),
      ]);
      setBooks(b); setLoans(l); setTop(t);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { loadAll(); }, [search, sort, onlyAvailable]);

  const activeLoans = loans.filter((l) => l.status !== "returned");

const historyLoans = Array.isArray(loans) ? loans.filter(l => l.status === "returned" || l.returnedAt) : [];

  async function onBorrow(book) {
    setBusy(true);
    setError("");
    try {
      const loan = await apiBorrow(book.id);
      alert(`הספר הושאל: ${book.title} עד ${new Date(loan.dueAt).toLocaleDateString()}`);
      await loadAll();
    } catch (e) {
      if (e?.status === 409) alert("לא זמין כרגע — מישהו אחר כבר השאיל את הספר.");
      else setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onReturn(loan) {
    setBusy(true);
    setError("");
    try {
      await apiReturn(loan.loanId);
      alert("החזרה בוצעה: " + loan.book.title);
      await loadAll();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }


  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <header className="hero mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-semibold">הספרייה הדיגיטלית</h1>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline">API_BASE: {API_BASE}</Badge>
            <Badge variant="outline">USER_ID: {USER_ID}</Badge>
            <Button variant="outline" size="sm" onClick={loadAll} disabled={busy}>רענון</Button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          שגיאה: {error}
        </div>
      )}

      {/* פס דיבאג קטן: כמה קיבלנו מכול ראוט */}
      <div className="mb-4 flex flex-wrap gap-2 text-sm text-gray-600">
        <Badge variant="outline">ספרים: {Array.isArray(books) ? books.length : 0}</Badge>
        <Badge variant="outline">השאלות: {Array.isArray(loans) ? loans.length : 0}</Badge>
        <Badge variant="outline">Top10: {Array.isArray(top) ? top.length : 0}</Badge>
      </div>

      {top?.length > 0 && (
        <section className="mb-5 flex items-center gap-2 overflow-x-auto pb-2">
          <span className="shrink-0 text-sm">פופולרי (Top 10):</span>
          {top.map((t) => (
            <Badge key={t.id || t.bookId} variant="outline" className="cursor-pointer" onClick={() => setSearch(t.title || t.book?.title || "")}>
              {t.title || t.book?.title || "ללא כותרת"}
            </Badge>
          ))}
        </section>
      )}

      <div className="tabs mb-3">
        <button className={`tab-btn ${tab === "library" ? "tab-btn-active" : ""}`} onClick={() => setTab("library")}>
          ספרייה
        </button>
        <button className={`tab-btn ${tab === "my" ? "tab-btn-active" : ""}`} onClick={() => setTab("my")}>
          הספרים שלי
        </button>
      </div>

      {tab === "library" && (
        <div className="pt-2">
          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-6">
              <Input placeholder="חיפוש לפי כותרת/מחבר/תגית" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="md:col-span-3">
              <select
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="title">כותרת (א-ת)</option>
                <option value="author">מחבר (א-ת)</option>
                <option value="popularity">פופולריות</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <Button
                variant={onlyAvailable ? "default" : "outline"}
                className="w-full"
                onClick={() => setOnlyAvailable((v) => !v)}
              >
                הצג רק זמינים
              </Button>
            </div>
          </div>

          {busy && <div className="mb-3 text-sm text-gray-500">טוען…</div>}

          {Array.isArray(books) && books.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {books.map((b) => (
                <Card key={b.id} className="shadow-sm">
                  <CardContent>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-semibold leading-tight">{b.title}</h3>
                        <p className="text-sm text-gray-500">{b.author}</p>
                      </div>
                      <Badge variant={b.available ? "default" : "secondary"}>
                        {b.available ? "זמין" : "מושאל"}
                      </Badge>
                    </div>

                    {b.tags?.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1">
                        {b.tags.map((t) => (
                          <Badge key={t} variant="outline">{t}</Badge>
                        ))}
                      </div>
                    )}

                    {!b.available && b.dueAt && (
                      <div className="mb-3 text-sm">
                        להחזרה עד {new Date(b.dueAt).toLocaleDateString()} (
                        <span className={daysLeft(b.dueAt) < 3 ? "text-red-600" : ""}>{daysLeft(b.dueAt)} ימים</span>)
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <Button onClick={() => onBorrow(b)} disabled={!b.available || busy} className="w-full">
                        השאל
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!b.fileUrl || busy}
                        className="w-28"
                        onClick={() => b.fileUrl && window.open(b.fileUrl, "_blank")}
                      >
                        PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="rounded-2xl">
              <CardContent className="p-6 text-center text-sm text-gray-500">
                אין ספרים להצגה כרגע.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "my" && (
  <div className="pt-4">
    <div className="mb-3 flex items-center justify-between">
      <div className="text-sm text-gray-500">
        {showHistory ? "היסטוריית השאלות" : "השאלות פעילות"}
      </div>
      <div className="flex gap-2">
        <Button
          variant={showHistory ? "outline" : "default"}
          onClick={() => setShowHistory(false)}
        >
          פעילים
        </Button>
        <Button
          variant={showHistory ? "default" : "outline"}
          onClick={() => setShowHistory(true)}
        >
          היסטוריה
        </Button>
      </div>
    </div>

    {!showHistory ? (
      // --- תצוגת מושאלים פעילים ---
      activeLoans.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-6 text-center text-sm text-gray-500">
            אין כרגע ספרים מושאלים.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeLoans.map(l => (
            <Card key={l.loanId} className="shadow-sm">
              <CardContent>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold leading-tight">{l.book.title}</h3>
                    <p className="text-sm text-gray-500">{l.book.author}</p>
                  </div>
                  <Badge>{l.status === "overdue" ? "איחור" : "מושאל"}</Badge>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
                  <div>הושאל: {fmtDate(l.borrowedAt)}</div>
                  <div>להחזרה: {fmtDate(l.dueAt)} ({daysLeft(l.dueAt)} ימים)</div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button onClick={()=>onReturn(l)} disabled={busy} className="w-full">החזר</Button>
                  <Button variant="outline" disabled={!l.book?.fileUrl || busy} className="w-28" asChild>
                    <a href={l.book?.fileUrl || "#"} target={l.book?.fileUrl ? "_blank" : undefined} rel="noreferrer">PDF</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    ) : (
      // --- תצוגת היסטוריה ---
      historyLoans.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-6 text-center text-sm text-gray-500">
            אין השאלות היסטוריות להצגה.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {historyLoans.map(l => (
            <Card key={l.loanId} className="shadow-sm">
              <CardContent>
                <div className="mb-2">
                  <h3 className="text-lg font-semibold leading-tight">{l.book.title}</h3>
                  <p className="text-sm text-gray-500">{l.book.author}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>הושאל: {fmtDate(l.borrowedAt)}</div>
                  <div>הוחזר: {l.returnedAt ? fmtDate(l.returnedAt) : "-"}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )
    )}
  </div>
)}

      <footer className="mt-6 text-center text-xs text-gray-500">
        מצב API: Real · RTL פעיל · Tailwind · API_BASE: {API_BASE} · USER_ID: {USER_ID}
      </footer>
    </div>
  );
}

