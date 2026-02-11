import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import type { DictionaryEntry } from "./types";

export function useDictionaryPageState() {
  const [activeTab, setActiveTab] = useState<"browse" | "add">("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [newSignName, setNewSignName] = useState("");
  const [newSignCategory, setNewSignCategory] = useState("General");
  const [addingSign, setAddingSign] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  const [selectedSign, setSelectedSign] = useState<DictionaryEntry | null>(null);
  const [selectedChildren, setSelectedChildren] = useState<Set<Id<"children">>>(new Set());
  const [addingToChildren, setAddingToChildren] = useState(false);

  const [editingSignId, setEditingSignId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", category: "" });
  const [deletingEntry, setDeletingEntry] = useState<DictionaryEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isSeeding, setIsSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState("");
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionMessage, setSuggestionMessage] = useState("");

  return {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    newSignName,
    setNewSignName,
    newSignCategory,
    setNewSignCategory,
    addingSign,
    setAddingSign,
    addError,
    setAddError,
    addSuccess,
    setAddSuccess,
    selectedSign,
    setSelectedSign,
    selectedChildren,
    setSelectedChildren,
    addingToChildren,
    setAddingToChildren,
    editingSignId,
    setEditingSignId,
    editForm,
    setEditForm,
    deletingEntry,
    setDeletingEntry,
    isDeleting,
    setIsDeleting,
    isSeeding,
    setIsSeeding,
    seedMessage,
    setSeedMessage,
    isSuggesting,
    setIsSuggesting,
    suggestionMessage,
    setSuggestionMessage,
  };
}
