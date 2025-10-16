"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DIAGRAM_TYPES = [
  { value: "auto", label: "自动选择" },
  { value: "flowchart", label: "流程图" },
  { value: "sequenceDiagram", label: "时序图" },
  { value: "classDiagram", label: "类图" },
];

export function DiagramTypeSelector({ value, onChange }) {
  return (
    <div className="flex items-center justify-end w-full md:w-auto">
      {/* <Label htmlFor="diagram-type">图表类型</Label> */}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="diagram-type" className="w-full md:w-auto text-xs">
          <SelectValue placeholder="选择图表类型" />
        </SelectTrigger>
        <SelectContent>
          {DIAGRAM_TYPES.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 