"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import type { UserSuggestion } from "@/types/memo.types";

interface UserAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectUser?: (user: UserSuggestion) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function UserAutocomplete({
  value,
  onChange,
  onSelectUser,
  placeholder = "Type a name...",
  className = "",
  required = false,
}: UserAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/memos/users?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data: UserSuggestion[] = await res.json();
        setSuggestions(data);
        setShowDropdown(data.length > 0);
        setHighlightIndex(-1);
      }
    } catch {
      // Silently fail — user can still type freely
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers(val);
    }, 300);
  };

  const handleSelect = (user: UserSuggestion) => {
    onChange(user.name);
    setShowDropdown(false);
    setSuggestions([]);
    if (onSelectUser) onSelectUser(user);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setShowDropdown(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        required={required}
      />
      {isLoading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      )}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((user, idx) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleSelect(user)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                idx === highlightIndex ? "bg-blue-50" : ""
              }`}
            >
              <div className="font-medium text-gray-900">{user.name}</div>
              <div className="text-xs text-gray-500">
                {[user.position, user.department].filter(Boolean).join(" — ") || user.email}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
