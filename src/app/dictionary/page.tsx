"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DictionaryPageClient } from "@/features/dictionary/DictionaryPageClient";

export default function DictionaryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    router.push("/auth/signin");
    return null;
  }

  return <DictionaryPageClient />;
}
