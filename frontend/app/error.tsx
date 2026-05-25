'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel space-y-3 p-6">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <button className="rounded bg-red-500 px-3 py-2 text-sm" onClick={reset}>
        Retry
      </button>
    </div>
  );
}
