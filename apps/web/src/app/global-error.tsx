"use client";

// Replaces the root layout when it fails, so it cannot rely on providers, fonts or the design tokens.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          minHeight: "100dvh",
          placeItems: "center",
          margin: 0,
        }}
      >
        <main style={{ textAlign: "center", padding: "1rem" }}>
          <h1>خطای غیرمنتظره</h1>
          <p>صفحه بارگذاری نشد. لطفاً دوباره تلاش کنید.</p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: "0.5rem 1.25rem", fontSize: "1rem" }}
          >
            تلاش دوباره
          </button>
        </main>
      </body>
    </html>
  );
}
