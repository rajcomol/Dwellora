export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div
        aria-label="Loading"
        className="h-10 w-10 animate-spin rounded-full border-4 border-renovation-border border-t-foreground dark:border-renovation-border dark:border-t-foreground"
      />
    </div>
  );
}
