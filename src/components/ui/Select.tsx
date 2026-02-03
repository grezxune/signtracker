"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "pill" | "minimal";
}

// Hook to calculate dropdown position - returns null until position is ready
function useDropdownPosition(
  triggerRef: React.RefObject<HTMLElement | null>,
  isOpen: boolean
) {
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [triggerRef]);

  // Calculate position immediately when opening (before render)
  useEffect(() => {
    if (isOpen) {
      // Immediate sync update
      updatePosition();
      
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    } else {
      // Reset position when closed so next open recalculates fresh
      setPosition(null);
    }
  }, [isOpen, updatePosition]);

  return position;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  size = "md",
  variant = "default",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const position = useDropdownPosition(triggerRef, isOpen);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current && 
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  // Size classes
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-5 py-4 text-lg",
  };

  // Variant classes
  const variantClasses = {
    default: "bg-white border border-gray-300 rounded-xl shadow-sm",
    pill: "bg-gray-100 border-0 rounded-full",
    minimal: "bg-transparent border-0",
  };

  // Variant classes for dropdown
  const dropdownVariantClasses = {
    default: "bg-white border border-gray-200 rounded-xl shadow-lg",
    pill: "bg-white border border-gray-200 rounded-2xl shadow-lg",
    minimal: "bg-white border border-gray-200 rounded-xl shadow-lg",
  };

  // Only render dropdown when position is calculated to prevent fly-in from top-left
  const dropdown = isOpen && mounted && position && (
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 9999,
      }}
      className={`
        ${dropdownVariantClasses[variant]}
        overflow-hidden
        animate-in fade-in slide-in-from-top-2 duration-150
      `}
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
            className={`
              w-full text-left px-4 py-3 text-base
              transition-colors duration-100
              ${option.value === value
                ? "bg-indigo-50 text-indigo-700 font-medium"
                : "text-gray-700 hover:bg-gray-50"
              }
            `}
          >
            <div className="flex items-center justify-between">
              <span>{option.label}</span>
              {option.value === value && (
                <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
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
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between gap-2
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          text-gray-900 font-medium
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1
          transition-all duration-150
          ${isOpen ? "ring-2 ring-indigo-500" : ""}
        `}
      >
        <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
          {selectedOption?.label || placeholder}
        </span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown via Portal */}
      {mounted && createPortal(dropdown, document.body)}
    </div>
  );
}

// Confidence Select - specific styling for confidence badges
interface ConfidenceSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function ConfidenceSelect({ value, onChange }: ConfidenceSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const position = useDropdownPosition(triggerRef, isOpen);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current && 
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const options = [
    { value: "learning", label: "Learning", color: "bg-blue-100 text-blue-700" },
    { value: "familiar", label: "Familiar", color: "bg-yellow-100 text-yellow-700" },
    { value: "mastered", label: "Mastered", color: "bg-green-100 text-green-700" },
  ];

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Only render dropdown when position is calculated to prevent fly-in from top-left
  const dropdown = isOpen && mounted && position && (
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: position.top,
        left: position.left - 40, // Offset to align right edge better
        minWidth: 160,
        zIndex: 9999,
      }}
      className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => {
            onChange(option.value);
            setIsOpen(false);
          }}
          className={`
            w-full text-left px-4 py-3 text-sm
            transition-colors duration-100
            ${option.value === value ? "bg-gray-50" : "hover:bg-gray-50"}
          `}
        >
          <div className="flex items-center justify-between gap-3">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${option.color}`}>
              {option.label}
            </span>
            {option.value === value && (
              <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
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
        onClick={() => setIsOpen(!isOpen)}
        className={`
          px-3 py-1.5 rounded-full text-sm font-medium
          ${selectedOption.color}
          flex items-center gap-1
          transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400
        `}
      >
        <span>{selectedOption.label}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown via Portal */}
      {mounted && createPortal(dropdown, document.body)}
    </div>
  );
}
