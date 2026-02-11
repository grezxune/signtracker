"use client";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ChildSelectionModal } from "./ChildSelectionModal";
import { DictionaryAddTab } from "./DictionaryAddTab";
import { DictionaryBrowseTab } from "./DictionaryBrowseTab";
import { DictionaryGovernancePanel } from "./DictionaryGovernancePanel";
import { DictionaryTabsHeader } from "./DictionaryTabsHeader";
import type { ChildSummary, DictionaryEntry, PendingSuggestion } from "./types";
import { toErrorMessage } from "./utils";
import { useDictionaryPageState } from "./useDictionaryPageState";

export function DictionaryPageClient() {
  const state = useDictionaryPageState();
  const children = (useQuery(api.children.list, {}) || []) as ChildSummary[];
  const categories = useQuery(api.signLookup.getCategories, {});
  const isSuperUser = useQuery(api.signLookup.isSuperUser, {}) === true;
  const dictionary = useQuery(api.signLookup.browseDictionaryGlobal, { category: state.selectedCategory === "all" ? undefined : state.selectedCategory, search: state.searchQuery || undefined, limit: 100 }) as DictionaryEntry[] | undefined;
  const suggestions = useQuery(api.signLookup.listDictionarySuggestions, isSuperUser ? { status: "pending", limit: 25 } : "skip") as PendingSuggestion[] | undefined;
  const addKnownSign = useMutation(api.signs.addKnown);
  const quickAddSign = useAction(api.signLookup.quickAdd);
  const editDictionaryEntry = useMutation(api.signLookup.editDictionaryEntry);
  const deleteDictionaryEntry = useMutation(api.signLookup.deleteDictionaryEntry);
  const seedCoreDictionary = useMutation(api.signLookup.seedCoreDictionary);
  const reviewSuggestion = useMutation(api.signLookup.reviewDictionarySuggestion);
  const requestSuggestion = useMutation(api.signLookup.requestDictionarySuggestion);
  const allCategoryOptions = categories || ["General"];

  const toggleChildSelection = (childId: Id<"children">) => {
    const next = new Set(state.selectedChildren);
    if (next.has(childId)) {
      next.delete(childId);
    } else {
      next.add(childId);
    }
    state.setSelectedChildren(next);
  };

  const handleAddNewSign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!state.newSignName.trim()) return;
    state.setAddingSign(true);
    state.setAddError("");
    state.setAddSuccess("");
    try {
      await quickAddSign({ searchQuery: state.newSignName.trim(), category: state.newSignCategory !== "all" ? state.newSignCategory : undefined, dictionaryOnly: true });
      state.setAddSuccess(`Added "${state.newSignName.trim()}" to the dictionary!`);
      state.setNewSignName("");
    } catch (error) {
      state.setAddError(toErrorMessage(error, "Failed to add sign"));
    } finally {
      state.setAddingSign(false);
    }
  };

  const handleAddToChildren = async () => {
    if (!state.selectedSign || state.selectedChildren.size === 0) return;
    state.setAddingToChildren(true);
    try {
      for (const childId of state.selectedChildren) {
        await addKnownSign({ childId, signId: state.selectedSign.signId, signName: state.selectedSign.name, signCategory: state.selectedSign.category });
      }
      state.setSelectedSign(null);
      state.setSelectedChildren(new Set());
    } finally {
      state.setAddingToChildren(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DictionaryTabsHeader activeTab={state.activeTab} onTabChange={state.setActiveTab} />
      <main className="mx-auto max-w-5xl px-4 pb-8">
        {state.activeTab === "browse" ? (
          <DictionaryBrowseTab
            searchQuery={state.searchQuery}
            onSearchQueryChange={state.setSearchQuery}
            selectedCategory={state.selectedCategory}
            onSelectedCategoryChange={state.setSelectedCategory}
            allCategoryOptions={allCategoryOptions}
            dictionary={dictionary}
            childrenCount={children.length}
            isSuperUser={isSuperUser}
            editingSignId={state.editingSignId}
            editForm={state.editForm}
            onEditFormChange={state.setEditForm}
            onStartEdit={(entry) => {
              state.setEditForm({ name: entry.name, description: entry.description || "", category: entry.category || "" });
              state.setEditingSignId(entry.signId);
            }}
            onCancelEdit={() => state.setEditingSignId(null)}
            onSaveEdit={async (entry) => {
              await editDictionaryEntry({ signId: entry.signId, name: state.editForm.name || undefined, description: state.editForm.description || undefined, category: state.editForm.category || undefined });
              state.setEditingSignId(null);
            }}
            onDelete={(entry) => state.setDeletingEntry(entry)}
            onSelectSign={(entry) => {
              state.setSelectedSign(entry);
              state.setSelectedChildren(new Set());
            }}
            onSwitchToAdd={() => {
              state.setNewSignName(state.searchQuery);
              state.setActiveTab("add");
            }}
          />
        ) : (
          <div className="space-y-4">
            <DictionaryAddTab
              newSignName={state.newSignName}
              onNewSignNameChange={state.setNewSignName}
              newSignCategory={state.newSignCategory}
              onNewSignCategoryChange={state.setNewSignCategory}
              allCategoryOptions={allCategoryOptions}
              addingSign={state.addingSign}
              addError={state.addError}
              addSuccess={state.addSuccess}
              onSubmit={handleAddNewSign}
              canSuggest={!isSuperUser}
              onSuggest={async () => {
                state.setIsSuggesting(true);
                state.setSuggestionMessage("");
                try {
                  await requestSuggestion({ term: state.newSignName.trim(), category: state.newSignCategory !== "all" ? state.newSignCategory : undefined });
                  state.setSuggestionMessage("Suggestion submitted for review.");
                } catch (error) {
                  state.setSuggestionMessage(toErrorMessage(error, "Failed to submit suggestion"));
                } finally {
                  state.setIsSuggesting(false);
                }
              }}
              isSuggesting={state.isSuggesting}
              suggestionMessage={state.suggestionMessage}
            />
            {isSuperUser && (
              <DictionaryGovernancePanel
                suggestions={suggestions}
                isSeeding={state.isSeeding}
                seedMessage={state.seedMessage}
                onSeed={async () => {
                  state.setIsSeeding(true);
                  try {
                    const result = await seedCoreDictionary({});
                    state.setSeedMessage(`Seeded dictionary: ${result.inserted} inserted, ${result.updated} updated.`);
                  } finally {
                    state.setIsSeeding(false);
                  }
                }}
                onApprove={async (suggestionId) => {
                  await reviewSuggestion({ suggestionId, decision: "approved" });
                }}
                onReject={async (suggestionId) => {
                  await reviewSuggestion({ suggestionId, decision: "rejected" });
                }}
              />
            )}
          </div>
        )}
      </main>
      <ChildSelectionModal selectedSign={state.selectedSign} childOptions={children} selectedChildren={state.selectedChildren} addingToChildren={state.addingToChildren} onToggleChild={toggleChildSelection} onAdd={handleAddToChildren} onClose={() => { state.setSelectedSign(null); state.setSelectedChildren(new Set()); }} />
      <ConfirmationModal
        isOpen={state.deletingEntry !== null}
        onClose={() => state.setDeletingEntry(null)}
        onConfirm={async () => {
          if (!state.deletingEntry) return;
          state.setIsDeleting(true);
          try {
            await deleteDictionaryEntry({ signId: state.deletingEntry.signId });
          } finally {
            state.setIsDeleting(false);
            state.setDeletingEntry(null);
          }
        }}
        title={`Delete "${state.deletingEntry?.name}"?`}
        message="This will permanently delete the sign from the dictionary and remove it from all child profiles."
        confirmText="Delete Forever"
        cancelText="Keep It"
        variant="danger"
        isLoading={state.isDeleting}
      />
    </div>
  );
}
