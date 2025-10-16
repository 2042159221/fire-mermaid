"use client";

import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Brain } from "lucide-react";
import { 
  getAvailableModels, 
  getSelectedModel, 
  saveSelectedModel, 
  getModelInfo,
  hasUnlimitedAccess 
} from "@/lib/config-service";
import { toast } from "sonner";

export function ModelSelector({ onModelChange }) {
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  
  // 使用useRef存储onModelChange的最新值
  const onModelChangeRef = useRef(onModelChange);
  
  // 更新ref中的值
  useEffect(() => {
    onModelChangeRef.current = onModelChange;
  }, [onModelChange]);

  // 加载可用模型和当前选择
  useEffect(() => {
    const loadModels = async () => {
      try {
        setIsLoading(true);
        
        // 检查用户权限
        const access = hasUnlimitedAccess();
        setHasAccess(access);
        
        if (!access) {
          setIsLoading(false);
          return;
        }

        // 获取可用模型
        const models = await getAvailableModels();
        setAvailableModels(models);
        
        // 获取当前选择的模型
        const currentModel = getSelectedModel();
        setSelectedModel(currentModel);
        
        // 如果当前选择的模型不在可用列表中，选择第一个可用模型
        if (models.length > 0 && !models.find(m => m.id === currentModel)) {
          const firstModel = models[0].id;
          setSelectedModel(firstModel);
          saveSelectedModel(firstModel);
          if (onModelChangeRef.current) {
            onModelChangeRef.current(firstModel);
          }
        }
      } catch (error) {
        console.error('Failed to load models:', error);
        toast.error("加载模型列表失败");
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, []); // 移除onModelChange依赖

  const handleModelChange = (modelId) => {
    setSelectedModel(modelId);
    saveSelectedModel(modelId);
    
    const modelInfo = getModelInfo(modelId, availableModels);
    toast.success(`已切换到 ${modelInfo.name}`);
    
    if (onModelChange) {
      onModelChange(modelId);
    }
  };

  // 如果用户没有权限，不显示组件
  if (!hasAccess) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Brain className="h-4 w-4 animate-pulse" />
        <span>加载中...</span>
      </div>
    );
  }

  if (availableModels.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {/* <Brain className="h-4 w-4 text-muted-foreground flex-shrink-0" /> */}
      <Select value={selectedModel} onValueChange={handleModelChange}>
        <SelectTrigger className="w-32 md:w-32 text-xs text-left">
          <SelectValue placeholder="选择模型" />
        </SelectTrigger>
        <SelectContent>
          {availableModels.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center">
                <span className="font-medium text-xs">{model.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
} 