"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Session } from "next-auth";
import type { ChildSummary } from "./types";
import { AddChildPanel } from "./AddChildPanel";
import { ChildrenGrid } from "./ChildrenGrid";
import { HomeHeader } from "./HomeHeader";

export function HomeDashboard({ session }: { session: Session }) {
  const children = (useQuery(api.children.list, {}) || []) as ChildSummary[];
  const createChild = useMutation(api.children.create);
  const syncCurrentUser = useMutation(api.users.syncCurrent);

  const [showAdd, setShowAdd] = useState(false);

  const handleCreateChild = async ({ name, birthDate }: { name: string; birthDate: string }) => {
    try {
      await createChild({
        name,
        birthDate: birthDate || undefined,
      });
      setShowAdd(false);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (!message.includes("unauthorized")) throw error;

      await syncCurrentUser({});
      await createChild({
        name,
        birthDate: birthDate || undefined,
      });
      setShowAdd(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <HomeHeader session={session} />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800">My Children</h2>
          <button
            data-testid="add-child-open"
            type="button"
            onClick={() => setShowAdd(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700"
          >
            + Add Child
          </button>
        </div>

        {showAdd && (
          <AddChildPanel
            onCreate={handleCreateChild}
            onCancel={() => setShowAdd(false)}
          />
        )}

        <ChildrenGrid childCards={children} onOpenAdd={() => setShowAdd(true)} />
      </main>
    </div>
  );
}
