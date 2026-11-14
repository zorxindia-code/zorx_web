import { LoadingIndicator } from "@/components/ui/LoadingIndicator";

/** Route-level loading UI (Suspense fallback) — the normal ZORX indicator, never the intro. */
export default function Loading() {
  return (
    <div className="grid min-h-svh place-items-center bg-black">
      <LoadingIndicator size={32} />
    </div>
  );
}
