"use client";

import { useCallback, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder: string;
  className?: string;
  inputMode?: "numeric" | "decimal";
  autoFocus?: boolean;
  id?: string;
};

export function PlaceholderNumberInput({
  value,
  onChange,
  placeholder,
  className,
  inputMode = "decimal",
  autoFocus,
  id,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState("");

  const handleFocus = useCallback(() => {
    setFocused(true);
    setText("");
  }, []);

  const handleBlur = useCallback(() => {
    setFocused(false);
    const trimmed = text.trim();
    if (trimmed === "") {
      onChange(null);
      return;
    }
    const parsed = parseFloat(trimmed.replace(",", "."));
    onChange(Number.isFinite(parsed) ? parsed : null);
  }, [text, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v !== "" && !/^[\d,.]*$/.test(v)) return;
    setText(v);
    const trimmed = v.trim();
    if (trimmed === "") {
      onChange(null);
      return;
    }
    const parsed = parseFloat(trimmed.replace(",", "."));
    if (Number.isFinite(parsed)) onChange(parsed);
  };

  const displayValue = focused ? text : value != null ? String(value) : "";

  return (
    <Input
      id={id}
      type="text"
      inputMode={inputMode}
      placeholder={placeholder}
      value={displayValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      autoFocus={autoFocus}
      className={cn("keyboard-stable-input", className)}
    />
  );
}
