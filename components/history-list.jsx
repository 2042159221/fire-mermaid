"use client";

import { Button } from "@/components/ui/button";

export function HistoryList({ items, onSelect, onDelete, onClear }) {
  return (
    <div className="h-full overflow-auto space-y-2">
      <div className="flex justify-between items-center mb-1">
        <div className="text-sm text-muted-foreground">共 {items?.length || 0} 条</div>
        {onClear && (
          <Button size="sm" variant="outline" onClick={onClear}>清空</Button>
        )}
      </div>
      {(items || []).map(item => (
        <div key={item.id} className="border rounded-md p-2 hover:bg-muted/50 cursor-pointer"
             onClick={() => onSelect?.(item)}>
          <div className="text-xs text-muted-foreground mb-1">{new Date(item.createdAt).toLocaleString()}</div>
          <div className="text-sm line-clamp-2">{item.inputText}</div>
          {onDelete && (
            <div className="flex justify-end mt-1">
              <Button size="xs" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>删除</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


