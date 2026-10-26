"use client";

import { useSearchParams } from "next/navigation";
import IntroState from "@/components/IntroState";
import TrackWallClient from "@/components/TrackWallClient";

export default function WallPage() {
  const searchParams = useSearchParams();
  const username = searchParams.get("username");

  return (
    <main className="fixed inset-0 bg-linear-to-br from-[#1a0b2e] via-[#1f0c38] to-[#000000] -z-10">
      <div className="relative w-full h-full">
        <div className="absolute inset-0 bg-black/30 pointer-events-none"></div>
        {!username ? <IntroState /> : <TrackWallClient username={username} />}
      </div>
    </main>
  );
}
