"use client";

import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Copy, Check, Wand2, ArrowLeftRight } from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import { autoFixMermaidCode, toggleMermaidDirection } from "@/lib/mermaid-fixer";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { optimizeMermaidCode, fetchOptimizationSuggestions } from "@/lib/ai-service";

// 新增的流式内容显示组件
function StreamingDisplay({ content, isStreaming, isFixing }) {
  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content]);


  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center h-6">
        <h3 className="text-sm font-medium">实时生成</h3>
        {isStreaming && (
          <div className="flex items-center text-xs text-muted-foreground">
            <div className="animate-pulse mr-1 h-2 w-2 rounded-full bg-green-500"></div>
            {isFixing ? "正在修复..." : "正在生成..."}
          </div>
        )}
      </div>
      <div
        ref={contentRef}
        className="border rounded-md p-3 h-24 overflow-y-auto font-mono text-sm bg-muted/50"
      >
        {content || "等待生成..."}
      </div>
    </div>
  );
}

export function MermaidEditor({ code, onChange, streamingContent, isStreaming, errorMessage, hasError, onStreamChunk, showRealtime = false }) {
  const [copied, setCopied] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixingContent, setFixingContent] = useState("");
  const [showOptimize, setShowOptimize] = useState(false);
  const [optTab, setOptTab] = useState("suggestions");
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [optInstruction, setOptInstruction] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  // 处理优化输入框的键盘快捷键（Ctrl+Enter 或 Cmd+Enter 提交）
  const handleOptimizeKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (optInstruction.trim() && !isOptimizing) {
        doOptimize(optInstruction);
      }
    }
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(code);

    if (success) {
      setCopied(true);
      toast.success("已复制到剪贴板");

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } else {
      toast.error("复制失败");
    }
  };

  const handleAutoFix = async () => {
    if (!code) {
      toast.error("没有代码可以修复");
      return;
    }

    setIsFixing(true);
    setFixingContent("");

    try {
      // 流式修复回调函数
      const handleFixChunk = (chunk) => {
        setFixingContent(prev => prev + chunk);
        // 如果有父组件的流式回调，也调用它
        if (onStreamChunk) {
          onStreamChunk(chunk);
        }
      };

      // 传递错误信息给AI修复函数
      const result = await autoFixMermaidCode(code, errorMessage, handleFixChunk);

      if (result.error) {
        toast.error(result.error);
        // 如果有基础修复的代码，仍然应用它
        if (result.fixedCode !== code) {
          onChange(result.fixedCode);
          toast.info("已应用基础修复");
        }
      } else {
        if (result.fixedCode !== code) {
          onChange(result.fixedCode);
          toast.success("AI修复完成");
        } else {
          toast.info("代码看起来没有问题");
        }
      }
    } catch (error) {
      console.error("修复失败:", error);
      toast.error("修复失败，请稍后重试");
    } finally {
      setIsFixing(false);
      setFixingContent("");
    }
  };

  const handleToggleDirection = () => {
    if (!code) {
      toast.error("没有代码可以切换方向");
      return;
    }

    const toggledCode = toggleMermaidDirection(code);
    if (toggledCode !== code) {
      onChange(toggledCode);
      toast.success("图表方向已切换");
    } else {
      toast.info("未检测到可切换的方向");
    }
  };

  const ensureSuggestionsLoaded = async () => {
    if (!showOptimize || optTab !== 'suggestions' || suggestions.length > 0 || !code) return;
    try {
      setLoadingSuggestions(true);
      const { suggestions: list, error } = await fetchOptimizationSuggestions(code);
      if (error) {
        toast.error(error);
      }
      setSuggestions(Array.isArray(list) ? list : []);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    ensureSuggestionsLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOptimize, optTab, code]);

  const doOptimize = async (instructionText) => {
    if (!code) {
      toast.error("没有代码可以优化");
      return;
    }
    setIsOptimizing(true);
    try {
      const handleOptChunk = (chunk) => {
        if (onStreamChunk) onStreamChunk(chunk);
      };
      const { optimizedCode, error, warnings } = await optimizeMermaidCode(code, instructionText || "", handleOptChunk);
      if (error) {
        toast.error(error);
        return;
      }
      if (!optimizedCode) {
        toast.error("优化失败，请重试");
        return;
      }
      onChange(optimizedCode);
      
      // 显示警告（如果有）
      if (warnings && warnings.length > 0) {
        warnings.forEach(warning => toast.warning(warning));
      }
      
      toast.success("优化完成");
    } catch (e) {
      toast.error("优化失败，请稍后重试");
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 流式内容显示区域 - 固定高度 */}
      {showRealtime && (
        <div className="mb-4">
          <StreamingDisplay
            content={isFixing ? fixingContent : streamingContent}
            isStreaming={isStreaming || isFixing}
            isFixing={isFixing}
          />
        </div>
      )}
      
      {/* 编辑器标题栏 - 固定高度 */}
      <div className="flex justify-between items-center h-8 mb-2">
        <h3 className="text-sm font-medium">Mermaid 代码</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOptimize(v => !v)}
            disabled={!code}
            className="h-7 gap-1 text-xs"
            title="继续优化"
          >
            继续优化
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoFix}
            disabled={!code || isFixing || !hasError}
            className="h-7 gap-1 text-xs"
            title={hasError ? "使用AI智能修复代码问题" : "当前代码没有错误，无需修复"}
          >
            {isFixing ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
            ) : (
              <Wand2 className="h-3 w-3" />
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleDirection}
            disabled={!code}
            className="h-7 gap-1 text-xs"
            title="切换图表方向 (横向/纵向)"
          >
            <ArrowLeftRight className="h-3 w-3" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!code}
            className="h-7 gap-1 text-xs"
          title={copied ? "已复制" : "复制代码"}
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* 代码编辑器容器 - 占用剩余空间 */}
      <div className="flex-1 min-h-0">
        <Textarea
          value={code}
          onChange={handleChange}
          placeholder="生成的 Mermaid 代码将显示在这里..."
          className="w-full h-full font-mono text-sm mermaid-editor overflow-y-auto resize-none"
          disabled={(showRealtime && isStreaming) || isFixing || isOptimizing}
        />
      </div>

      {/* 继续优化面板（可折叠） */}
      {showOptimize && (
        <div className="mt-2 border rounded-md p-2 h-44 flex flex-col">
          <Tabs value={optTab} onValueChange={setOptTab} className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <TabsList className="h-7">
                <TabsTrigger value="suggestions" className="text-xs">建议</TabsTrigger>
                <TabsTrigger value="custom" className="text-xs">自定义</TabsTrigger>
              </TabsList>
              <div className="text-xs text-muted-foreground">
                {isOptimizing ? "正在优化…" : (loadingSuggestions && optTab === 'suggestions' ? "加载建议…" : null)}
              </div>
            </div>

            <TabsContent value="suggestions" className="flex-1 overflow-auto mt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {(suggestions || []).map((s, idx) => (
                  <Button key={idx} variant="secondary" size="sm" className="h-8 text-xs truncate" disabled={isOptimizing}
                    onClick={() => doOptimize(s.instruction)}>
                    {s.title}
                  </Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="custom" className="flex-1 mt-0">
              <div className="flex flex-col h-full gap-2">
                <Textarea
                  value={optInstruction}
                  onChange={(e) => setOptInstruction(e.target.value)}
                  onKeyDown={handleOptimizeKeyDown}
                  placeholder="输入你的优化需求，例如：将方向改为LR，并用subgraph分组模块。(Ctrl+Enter 提交)"
                  className="w-full flex-1 min-h-0 max-h-40 text-sm resize-none overflow-y-auto"
                  disabled={isOptimizing}
                />
                <div className="flex justify-end flex-shrink-0">
                  <Button size="sm" onClick={() => doOptimize(optInstruction)} disabled={!optInstruction.trim() || isOptimizing}>
                    应用优化
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
} 