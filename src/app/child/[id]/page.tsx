"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChildPageClient } from "@/features/child/ChildPageClient";

export default function ChildPage({ params }: { params: Promise<{ id: string }> }) {
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

  return <ChildPageClient params={params} />;
}
