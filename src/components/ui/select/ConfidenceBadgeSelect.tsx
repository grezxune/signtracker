"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDismissHandlers } from "./useDismissHandlers";
import { useDropdownPosition } from "./useDropdownPosition";
import type { ConfidenceSelectProps } from "./types";

const confidenceOptions = [
  { value: "learning", label: "Learning", color: "bg-blue-100 text-blue-700" },
  { value: "familiar", label: "Familiar", color: "bg-yellow-100 text-yellow-700" },
  { value: "mastered", label: "Mastered", color: "bg-green-100 text-green-700" },
];

export function ConfidenceBadgeSelect({ value, onChange }: ConfidenceSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const position = useDropdownPosition(triggerRef, isOpen, -40);
  const canUsePortal = typeof document !== "undefined";

  useDismissHandlers(triggerRef, dropdownRef, () => setIsOpen(false));

  const selectedOption = confidenceOptions.find((option) => option.value === value) || confidenceOptions[0];

  const dropdown = isOpen && canUsePortal && position && (
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        minWidth: 160,
        zIndex: 9999,
      }}
      className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {confidenceOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => {
            onChange(option.value);
            setIsOpen(false);
          }}
          className={`w-full px-4 py-3 text-left text-sm transition-colors duration-100 ${
            option.value === value ? "bg-gray-50" : "hover:bg-gray-50"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${option.color}`}>{option.label}</span>
            {option.value === value && (
              <svg className="h-4 w-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`${selectedOption.color} flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1`}
      >
        <span>{selectedOption.label}</span>
        <svg
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {canUsePortal && createPortal(dropdown, document.body)}
    </div>
  );
}
