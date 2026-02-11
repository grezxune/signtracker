"use client";

import { use, useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ChildHeader } from "./ChildHeader";
import { ChildStatsGrid } from "./ChildStatsGrid";
import { ChildTabs } from "./ChildTabs";
import { ShareTab } from "./ShareTab";
import { SignsTab } from "./SignsTab";
import type { ChildDetails, ChildStats, DictionaryResult, PendingInvite, SignsByCategory } from "./types";
import { toErrorMessage } from "./utils";

export function ChildPageClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const childId = id as Id<"children">;

  const child = useQuery(api.children.get, { childId }) as ChildDetails | null | undefined;
  const stats = useQuery(api.signs.getStats, { childId }) as ChildStats | null | undefined;
  const signsByCategory = useQuery(api.signs.listByCategory, { childId }) as SignsByCategory | undefined;
  const categories = useQuery(api.signLookup.getCategories, {});
  const pendingInvites = useQuery(api.children.getPendingInvites, child?.role === "owner" ? { childId } : "skip") as PendingInvite[] | undefined;

  const updateSign = useMutation(api.signs.updateKnown);
  const removeSign = useMutation(api.signs.removeKnown);
  const toggleFavorite = useMutation(api.signs.toggleFavorite);
  const updateAlias = useMutation(api.signs.updateAlias);
  const updateSignName = useMutation(api.signs.updateSignName);
  const shareChild = useMutation(api.children.share);
  const unshareChild = useMutation(api.children.unshare);
  const cancelInvite = useMutation(api.children.cancelInvite);
  const addKnownSign = useMutation(api.signs.addKnown);
  const quickAddSign = useAction(api.signLookup.quickAdd);
  const fetchMediaForSign = useAction(api.signLookup.fetchMediaForSign);

  const [activeTab, setActiveTab] = useState<"signs" | "share">("signs");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["Favorites"]));
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("General");
  const [addingSign, setAddingSign] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareSuccess, setShareSuccess] = useState("");
  const [sharingAction, setSharingAction] = useState<{ type: "unshare"; userId: Id<"users">; email: string } | { type: "cancel_invite"; inviteId: Id<"invites">; email: string } | null>(null);
  const [isManagingSharing, setIsManagingSharing] = useState(false);

  const dictionaryResults = useQuery(api.signLookup.browseDictionary, searchQuery.trim().length >= 2 ? { search: searchQuery.trim(), limit: 10, childId } : "skip") as DictionaryResult[] | undefined;
  const hasExactMatch = dictionaryResults?.some((sign) => sign.name.toLowerCase() === searchQuery.toLowerCase().trim()) || false;
  const allCategoryOptions = categories || ["General"];

  useEffect(() => {
    if (!signsByCategory) return;
    setExpandedCategories(new Set(["Favorites", ...signsByCategory.allCategories]));
  }, [signsByCategory]);

  if (child === undefined) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-lg text-gray-600">Loading...</div></div>;
  if (child === null) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="p-6 text-center"><h2 className="text-xl font-semibold text-gray-800">Child not found</h2><Link href="/" className="mt-4 inline-block text-lg text-indigo-600 hover:underline">Go back</Link></div></div>;

  const toggleCategory = (category: string) => setExpandedCategories((current) => {
    const next = new Set(current);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    return next;
  });

  const handleAddFromDictionary = async (sign: DictionaryResult) => {
    try {
      await addKnownSign({ childId, signId: sign.signId, signName: sign.name, signCategory: sign.category });
      setAddSuccess(`Added "${sign.name}" to ${child.name}'s signs!`);
      setSearchQuery("");
      setShowSearchResults(false);
      setTimeout(() => setAddSuccess(""), 3000);
    } catch (error) {
      setAddError(toErrorMessage(error, "Failed to add sign"));
      setTimeout(() => setAddError(""), 3000);
    }
  };

  const handleCreateNewSign = async () => {
    if (!searchQuery.trim()) return;
    setAddingSign(true);
    setAddError("");
    setAddSuccess("");
    try {
      await quickAddSign({ childId, searchQuery: searchQuery.trim(), category: selectedCategory !== "all" ? selectedCategory : undefined });
      setAddSuccess(`Added "${searchQuery.trim()}" to ${child.name}'s signs!`);
      setSearchQuery("");
      setShowSearchResults(false);
      setTimeout(() => setAddSuccess(""), 3000);
    } catch (error) {
      setAddError(toErrorMessage(error, "Failed to add sign"));
      setTimeout(() => setAddError(""), 3000);
    } finally {
      setAddingSign(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ChildHeader childName={child.name} />
      <ChildStatsGrid stats={stats} />
      <ChildTabs activeTab={activeTab} onTabChange={setActiveTab} totalSigns={child.signs.length} canShare={child.role === "owner"} />
      <main className="mx-auto max-w-5xl px-4 py-4">
        {activeTab === "signs" ? (
          <SignsTab
            childName={child.name}
            totalSigns={child.signs.length}
            signsByCategory={signsByCategory}
            expandedCategories={expandedCategories}
            onToggleCategory={toggleCategory}
            searchProps={{ searchQuery, onSearchQueryChange: setSearchQuery, showSearchResults, setShowSearchResults, dictionaryResults, hasExactMatch, selectedCategory, onSelectedCategoryChange: setSelectedCategory, allCategoryOptions, addingSign, onCreateNewSign: handleCreateNewSign, onAddFromDictionary: handleAddFromDictionary, addSuccess, addError }}
            onUpdate={updateSign}
            onRemove={removeSign}
            onToggleFavorite={toggleFavorite}
            onUpdateAlias={updateAlias}
            onUpdateSignName={updateSignName}
            onFetchMedia={(signId) => fetchMediaForSign({ signId })}
          />
        ) : (
          <ShareTab
            child={child}
            shareEmail={shareEmail}
            onShareEmailChange={setShareEmail}
            onShare={async (event) => {
              event.preventDefault();
              setShareError("");
              setShareSuccess("");
              try {
                const result = await shareChild({ childId, shareWithEmail: shareEmail });
                setShareSuccess(result?.status === "invited" ? `Invite sent to ${shareEmail}! They'll get access when they create an account.` : `Shared with ${shareEmail}!`);
                setShareEmail("");
              } catch (error) {
                setShareError(toErrorMessage(error, "Failed to share"));
              }
            }}
            shareError={shareError}
            shareSuccess={shareSuccess}
            pendingInvites={pendingInvites}
            onUnshare={(userId, email) => setSharingAction({ type: "unshare", userId, email })}
            onCancelInvite={(inviteId, email) => setSharingAction({ type: "cancel_invite", inviteId, email })}
          />
        )}
      </main>

      <ConfirmationModal
        isOpen={sharingAction !== null}
        onClose={() => setSharingAction(null)}
        onConfirm={async () => {
          if (!sharingAction) return;
          setIsManagingSharing(true);
          try {
            if (sharingAction.type === "unshare") {
              await unshareChild({ childId, targetUserId: sharingAction.userId });
            } else {
              await cancelInvite({ inviteId: sharingAction.inviteId });
            }
          } finally {
            setIsManagingSharing(false);
            setSharingAction(null);
          }
        }}
        title={sharingAction?.type === "unshare" ? `Remove access for ${sharingAction.email}?` : `Cancel invite for ${sharingAction?.email}?`}
        message={sharingAction?.type === "unshare" ? "This person will lose access to this child's tracking data." : "This pending invite will be removed and the recipient will need a new invite."}
        confirmText={sharingAction?.type === "unshare" ? "Remove Access" : "Cancel Invite"}
        cancelText="Keep"
        variant="danger"
        isLoading={isManagingSharing}
      />
    </div>
  );
}
