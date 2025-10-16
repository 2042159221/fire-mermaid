"use client";

import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { countCharacters } from "@/lib/utils";

export function TextInput({ value, onChange, maxChars }) {
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef(null);
  const containerRef = useRef(null);
  
  useEffect(() => {
    setCharCount(countCharacters(value));
  }, [value]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
  };

  const isOverLimit = maxChars && charCount > maxChars;

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      {/* 文本框容器 - 占用大部分空间 */}
      <div className="flex-1 min-h-0">
        <Textarea
          ref={textareaRef}
          placeholder="请在此输入或粘贴文本内容..."
          className="w-full h-full font-mono text-sm overflow-y-auto resize-none"
          value={value}
          onChange={handleChange}
        />
      </div>

      {/* 字符计数 - 固定高度 */}
      <div className="h-8 flex items-center justify-end text-sm">
        <span className={`${isOverLimit ? "text-destructive font-medium" : "text-muted-foreground"}`}>
          {charCount} {maxChars ? `/ ${maxChars} 字符` : "字符"}
        </span>
      </div>
    </div>
  );
} 