'use client';
export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div className="p-8 text-red-500 font-mono">
      <h2>Something went wrong!</h2>
      <pre className="mt-4 text-xs">{error.message}</pre>
      <button onClick={() => reset()} className="mt-4 bg-red-900/50 px-4 py-2 rounded">Try again</button>
    </div>
  );
}
