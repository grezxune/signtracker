"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDismissHandlers } from "./useDismissHandlers";
import { useDropdownPosition } from "./useDropdownPosition";
import type { SelectProps } from "./types";

const sizeClasses = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-3 text-base",
  lg: "px-5 py-4 text-lg",
};

const triggerVariantClasses = {
  default: "bg-white border border-gray-300 rounded-xl shadow-sm",
  pill: "bg-gray-100 border-0 rounded-full",
  minimal: "bg-transparent border-0",
};

const dropdownVariantClasses = {
  default: "bg-white border border-gray-200 rounded-xl shadow-lg",
  pill: "bg-white border border-gray-200 rounded-2xl shadow-lg",
  minimal: "bg-white border border-gray-200 rounded-xl shadow-lg",
};

export function BaseSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  size = "md",
  variant = "default",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const position = useDropdownPosition(triggerRef, isOpen);
  const canUsePortal = typeof document !== "undefined";

  useDismissHandlers(triggerRef, dropdownRef, () => setIsOpen(false));

  const selectedOption = options.find((option) => option.value === value);

  const dropdown = isOpen && canUsePortal && position && (
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 9999,
      }}
      className={`${dropdownVariantClasses[variant]} overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150`}
    >
      <div className="max-h-64 overflow-y-auto py-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(option.value);
              setIsOpen(false);
            }}
            className={`w-full px-4 py-3 text-left text-base transition-colors duration-100 ${
              option.value === value
                ? "bg-indigo-50 text-indigo-700 font-medium"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{option.label}</span>
              {option.value === value && (
                <svg className="h-5 w-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
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
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`w-full ${sizeClasses[size]} ${triggerVariantClasses[variant]} flex items-center justify-between gap-2 text-gray-900 font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${isOpen ? "ring-2 ring-indigo-500" : ""}`}
      >
        <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
          {selectedOption?.label || placeholder}
        </span>
        <svg
          className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
