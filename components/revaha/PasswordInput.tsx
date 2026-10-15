"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/** Password field with an eye button to show/hide what was typed. */
export function PasswordInput({
  name,
  value,
  onChange,
  placeholder,
  required,
  minLength,
  className = "",
}: {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  const controlled = value !== undefined;
  return (
    <div className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        autoComplete="new-password"
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        {...(controlled ? { value, onChange: (e) => onChange?.(e.target.value) } : {})}
        className={`w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-2.5 text-sm ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
        aria-pressed={show}
        className="absolute left-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
