"use client";

import { useState } from "react";
import Image from "next/image";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConfidenceSelect } from "@/components/ui/Select";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import type { ConfidenceLevel, KnownSign } from "./types";

function buildLifeprintUrl(sign: KnownSign) {
  if (sign.lifeprintUrl) return sign.lifeprintUrl;
  const slug = sign.signId.toLowerCase().replace(/\s+/g, "-");
  return `https://www.lifeprint.com/asl101/pages-signs/${sign.signId.charAt(0).toLowerCase()}/${slug}.htm`;
}

export function SignCard({
  sign,
  onUpdate,
  onRemove,
  onToggleFavorite,
  onUpdateAlias,
  onUpdateSignName,
  onFetchMedia,
}: {
  sign: KnownSign;
  onUpdate: (args: { knownSignId: Id<"knownSigns">; confidence?: ConfidenceLevel }) => Promise<unknown>;
  onRemove: (args: { knownSignId: Id<"knownSigns"> }) => Promise<unknown>;
  onToggleFavorite: (args: { knownSignId: Id<"knownSigns"> }) => Promise<unknown>;
  onUpdateAlias: (args: { knownSignId: Id<"knownSigns">; alias: string | null }) => Promise<unknown>;
  onUpdateSignName: (args: { knownSignId: Id<"knownSigns">; signName: string }) => Promise<unknown>;
  onFetchMedia: (signId: string) => Promise<{ type: string; url: string | null }>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editAlias, setEditAlias] = useState(sign.alias || "");
  const [editSignName, setEditSignName] = useState(sign.signName || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [media, setMedia] = useState<{ type: string; url: string | null } | null>(
    sign.gifUrl ? { type: "gif", url: sign.gifUrl } : sign.videoUrl ? { type: "video", url: sign.videoUrl } : sign.imageUrl ? { type: "image", url: sign.imageUrl } : null,
  );

  const displayName = sign.alias || sign.signName;
  const hasAlias = Boolean(sign.alias && sign.alias !== sign.signName);

  const handleSave = async () => {
    const alias = editAlias.trim();
    if (alias !== (sign.alias || "")) {
      await onUpdateAlias({ knownSignId: sign._id, alias: alias || null });
    }

    const updatedSignName = editSignName.trim();
    if (updatedSignName && updatedSignName !== sign.signName) {
      await onUpdateSignName({ knownSignId: sign._id, signName: updatedSignName });
    }

    setIsEditing(false);
  };

  const handleMediaToggle = async () => {
    if (media?.url) {
      setShowMedia((value) => !value);
      return;
    }

    setLoadingMedia(true);
    try {
      const result = await onFetchMedia(sign.signId);
      setMedia(result);
      if (result.url) setShowMedia(true);
    } finally {
      setLoadingMedia(false);
    }
  };

  if (isEditing) {
    return (
      <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4">
        <div className="space-y-3">
          <input value={editAlias} onChange={(event) => setEditAlias(event.target.value)} placeholder="Nickname" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900" />
          <input value={editSignName} onChange={(event) => setEditSignName(event.target.value)} placeholder="Sign name" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900" />
          <div className="flex gap-3"><button type="button" onClick={() => void handleSave()} className="flex-1 rounded-xl bg-indigo-600 py-3 font-medium text-white">Save</button><button type="button" onClick={() => { setEditAlias(sign.alias || ""); setEditSignName(sign.signName || ""); setIsEditing(false); }} className="flex-1 rounded-xl bg-gray-200 py-3 font-medium text-gray-700">Cancel</button></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="text-lg font-semibold text-gray-800">{displayName}</h4>{hasAlias && <span className="text-sm text-gray-500">(sign: {sign.signName})</span>}</div></div>
          <div className="flex items-center gap-1"><button type="button" onClick={() => void onToggleFavorite({ knownSignId: sign._id })} className={`p-2 text-2xl ${sign.favorite ? "text-yellow-500" : "text-gray-300"}`}>★</button><button type="button" onClick={() => setIsEditing(true)} className="p-2 text-xl text-gray-400 hover:text-gray-600">✏️</button></div>
        </div>

        {showMedia && media?.url && (
          <div className="mt-3 overflow-hidden rounded-xl bg-gray-100">
            {media.type === "video" ? (
              <video src={media.url} autoPlay loop muted playsInline className="mx-auto w-full max-w-[320px]" />
            ) : (
              <Image src={media.url} alt={`ASL sign for ${displayName}`} width={320} height={240} unoptimized className="mx-auto w-full max-w-[320px]" loading="lazy" />
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <ConfidenceSelect value={sign.confidence || "learning"} onChange={(value) => void onUpdate({ knownSignId: sign._id, confidence: value as ConfidenceLevel })} />
            <button type="button" onClick={() => void handleMediaToggle()} disabled={loadingMedia} className="rounded-full bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-100 disabled:opacity-50">{loadingMedia ? "Loading..." : showMedia ? "Hide" : "🎬 Show Sign"}</button>
            <a href={buildLifeprintUrl(sign)} target="_blank" rel="noopener noreferrer" className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600">Learn Sign →</a>
          </div>
          <button
            type="button"
            aria-label="Remove"
            title="Remove"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-lg text-red-400 hover:text-red-600"
          >
            🗑️
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          setIsDeleting(true);
          try {
            await onRemove({ knownSignId: sign._id });
          } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
          }
        }}
        title={`Remove "${displayName}"?`}
        message="This will remove the sign from this child's profile. You can always add it back later."
        confirmText="Remove"
        cancelText="Keep It"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
