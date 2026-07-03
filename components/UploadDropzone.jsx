// Drag-and-drop / click-to-upload zone.
// Reads the chosen PDF as base64, POSTs to /api/roast, caches the result in
// sessionStorage, and routes to the feedback page.
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/router";

const LOADING_LINES = [
  "Sharpening the wit…",
  "Counting the buzzwords…",
  "Looking for actual metrics…",
  "Judging your font choices…",
  "Preheating the oven…",
];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [line, setLine] = useState(LOADING_LINES[0]);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFile = useCallback(
    async (file) => {
      setError("");
      if (!file) return;
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please upload a PDF file.");
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setError("That PDF is larger than 8 MB.");
        return;
      }

      setFileName(file.name);
      setLoading(true);

      // Cycle the loading messages for a bit of fun.
      let i = 0;
      const cycle = setInterval(() => {
        i = (i + 1) % LOADING_LINES.length;
        setLine(LOADING_LINES[i]);
      }, 1400);

      try {
        const fileBase64 = await fileToBase64(file);
        const res = await fetch("/api/roast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileBase64, fileName: file.name }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "Failed to roast the resume.");

        // Cache so the feedback page can render even without a database.
        try {
          sessionStorage.setItem(
            `roast:${payload.id}`,
            JSON.stringify({ result: payload.result, fileName: file.name })
          );
        } catch (_) {}

        router.push(`/feedback/${payload.id}`);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      } finally {
        clearInterval(cycle);
      }
    },
    [router]
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !loading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !loading && inputRef.current?.click()}
        className={`card flex cursor-pointer flex-col items-center justify-center gap-4 px-6 py-14 text-center transition ${
          dragging ? "border-ember-400 bg-ember-500/5" : "hover:border-slate-600"
        } ${loading ? "pointer-events-none opacity-90" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {loading ? (
          <>
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-ember-500" />
            <div>
              <p className="font-display text-lg font-semibold text-ember-400">{line}</p>
              <p className="mt-1 text-sm text-slate-500">Roasting {fileName}</p>
            </div>
          </>
        ) : (
          <>
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-800 text-3xl">📄</div>
            <div>
              <p className="font-display text-lg font-semibold">Drop your resume PDF here</p>
              <p className="mt-1 text-sm text-slate-400">or click to browse · max 8 MB · PDF only</p>
            </div>
            <span className="btn-primary mt-2">Roast my resume 🔥</span>
          </>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
