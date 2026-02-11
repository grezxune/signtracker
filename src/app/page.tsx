"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { HomeDashboard } from "@/features/home/HomeDashboard";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
        <div className="text-white text-lg font-medium">Loading...</div>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (!session) {
    router.push("/auth/signin");
    return null;
  }

  return <HomeDashboard session={session} />;
}
