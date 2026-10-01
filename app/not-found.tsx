export default function NotFound() {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-300 select-none">
      <span className="text-xs uppercase tracking-[0.25em] text-amber-400/80 mb-2 font-medium">
        Error
      </span>
      <h1 className="text-2xl font-light tracking-wide text-zinc-100 font-serif">
        404 - Not Found
      </h1>
      <p className="mt-4 text-sm text-zinc-500">
        The page you are looking for does not exist.
      </p>
    </div>
  );
}
