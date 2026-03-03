export default function LoadingSpinner() {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-textSub">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-blue-500" />
      <span>Running simulation...</span>
    </div>
  );
}
