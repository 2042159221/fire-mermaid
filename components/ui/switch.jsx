"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function Switch({ checked = false, onCheckedChange, className, title }) {
  const [internalChecked, setInternalChecked] = React.useState(!!checked);

  React.useEffect(() => {
    setInternalChecked(!!checked);
  }, [checked]);

  const toggle = () => {
    const next = !internalChecked;
    setInternalChecked(next);
    if (onCheckedChange) onCheckedChange(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={internalChecked}
      onClick={toggle}
      title={title}
      className={cn(
        "relative inline-flex h-6 w-10 items-center rounded-full transition-colors",
        internalChecked ? "bg-primary" : "bg-muted",
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
          internalChecked ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  );
}


