export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div
        aria-label="Loading"
        className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-50"
      />
    </div>
  );
}

