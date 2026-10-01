'use client';

import dynamic from 'next/dynamic';

const GameCanvas = dynamic(
  () => import('@/components/GameCanvas').then((mod) => mod.GameCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-300 select-none">
        <span className="text-xs uppercase tracking-[0.25em] text-amber-400/80 mb-2 font-medium">
          Countryside Farm
        </span>
        <h1 className="text-2xl font-light tracking-wide text-zinc-100 font-serif">
          Pastoral
        </h1>
        <div className="mt-6 flex items-center gap-2 text-xs text-zinc-500 font-mono">
          <span>Preparing atmospheric landscape</span>
          <span className="animate-pulse">...</span>
        </div>
      </div>
    ),
  }
);

export default function Page() {
  return (
    <main className="w-screen h-screen overflow-hidden bg-zinc-950">
      <GameCanvas />
    </main>
  );
}
