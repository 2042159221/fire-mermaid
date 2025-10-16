"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  ZoomIn, 
  ZoomOut, 
  Minimize,
  Move
} from "lucide-react";
import { copyToClipboard } from "@/lib/utils";
import { toast } from "sonner";

export function MermaidRenderer({ mermaidCode, onChange, onErrorChange }) {
  const mermaidRef = useRef(null);
  const containerRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [lastPinchDistance, setLastPinchDistance] = useState(0);
  const [touchStartDistance, setTouchStartDistance] = useState(0);

  // 清理函数：移除任何残留的mermaid元素
  const cleanupMermaidElements = useCallback(() => {
    // 只清理可能冲突的特定ID元素，避免清理包含错误信息的元素
    const specificId = mermaidRef.current?.getAttribute('data-mermaid-id');
    if (specificId) {
      const existingElement = document.getElementById(specificId);
      if (existingElement && existingElement.parentNode && !mermaidRef.current?.contains(existingElement)) {
        existingElement.parentNode.removeChild(existingElement);
      }
    }
    
    // 清理明显的残留元素（不在我们容器内的）
    const strayElements = document.querySelectorAll('[id^="dmermaid-"]');
    strayElements.forEach(element => {
      if (element.parentNode && !mermaidRef.current?.contains(element)) {
        element.parentNode.removeChild(element);
      }
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const renderMermaid = async () => {
      if (!mermaidCode || !mermaidRef.current) {
        setIsLoading(false);
        // 通知父组件没有错误（因为没有代码）
        if (onErrorChange) {
          onErrorChange(null, false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Dynamic import to avoid SSR issues
        const mermaid = (await import("mermaid")).default;
        
        // Initialize mermaid with configuration
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true
          },
          sequence: {
            useMaxWidth: true,
            wrap: true
          },
          gantt: {
            useMaxWidth: true
          },
          journey: {
            useMaxWidth: true
          },
          pie: {
            useMaxWidth: true
          }
        });

        // 先使用parse验证语法，获取详细错误信息
        try {
          await mermaid.parse(mermaidCode);
        } catch (parseError) {
          // 语法错误，显示详细信息但不创建DOM元素
          if (mounted) {
            const errorMsg = 'Mermaid语法错误: ' + parseError.message;
            setError(errorMsg);
            setIsLoading(false);
            // 通知父组件有错误
            if (onErrorChange) {
              onErrorChange(errorMsg, true);
            }
          }
          return;
        }

        // 语法正确，清理可能的冲突元素
        cleanupMermaidElements();

        // Clear previous content
        mermaidRef.current.innerHTML = '';

        // Generate unique ID for this render
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // 存储ID用于后续清理
        mermaidRef.current.setAttribute('data-mermaid-id', id);
        
        // Render the diagram
        const { svg } = await mermaid.render(id, mermaidCode);
        
        if (mounted) {
          mermaidRef.current.innerHTML = svg;
          setIsLoading(false);
          // 通知父组件没有错误
          if (onErrorChange) {
            onErrorChange(null, false);
          }
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        
        if (mounted) {
          const errorMsg = '渲染Mermaid图表时出错: ' + err.message;
          setError(errorMsg);
          setIsLoading(false);
          // 通知父组件有错误
          if (onErrorChange) {
            onErrorChange(errorMsg, true);
          }
        }
      }
    };

    renderMermaid();

    return () => {
      mounted = false;
      // 组件卸载时清理
      cleanupMermaidElements();
    };
  }, [mermaidCode, cleanupMermaidElements]);

  // 监听全局事件
  useEffect(() => {
    const handleResetView = () => {
      handleZoomReset();
    };

    const handleToggleFullscreen = () => {
      toggleFullscreen();
    };

    window.addEventListener('resetView', handleResetView);
    window.addEventListener('toggleFullscreen', handleToggleFullscreen);

    return () => {
      window.removeEventListener('resetView', handleResetView);
      window.removeEventListener('toggleFullscreen', handleToggleFullscreen);
    };
  }, []);

  // 缩放功能
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.3));
  };

  const handleZoomReset = () => {
    setZoom(1);
    setTranslate({ x: 0, y: 0 });
  };

  // 鼠标滚轮缩放
  const handleWheel = useCallback((e) => {
    // 只有在图表容器内且按住Shift键时才触发缩放
    if (e.shiftKey && mermaidRef.current?.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();
      
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.3, Math.min(3, zoom * delta));
      
      // 缩放到鼠标位置
      const zoomDiff = newZoom / zoom;
      setTranslate(prev => ({
        x: mouseX - (mouseX - prev.x) * zoomDiff,
        y: mouseY - (mouseY - prev.y) * zoomDiff
      }));
      
      setZoom(newZoom);
    }
  }, [zoom]);

  // 触摸事件处理
  const getTouchDistance = (touches) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      setTouchStartDistance(distance);
      setLastPinchDistance(distance);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - translate.x, y: touch.clientY - translate.y });
    }
  }, [translate]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      
      if (lastPinchDistance > 0) {
        const scale = distance / lastPinchDistance;
        const newZoom = Math.max(0.3, Math.min(3, zoom * scale));
        setZoom(newZoom);
      }
      
      setLastPinchDistance(distance);
    } else if (e.touches.length === 1 && isDragging) {
      e.preventDefault();
      const touch = e.touches[0];
      setTranslate({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart, lastPinchDistance, zoom]);

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      setLastPinchDistance(0);
      setTouchStartDistance(0);
    }
  }, []);

  // 拖拽平移
  const handleMouseDown = (e) => {
    if (e.target === containerRef.current || mermaidRef.current?.contains(e.target)) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setTranslate({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleCopy = async () => {
    const success = await copyToClipboard(mermaidCode);
    
    if (success) {
      setCopied(true);
      toast.success("已复制Mermaid代码到剪贴板");
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } else {
      toast.error("复制失败");
    }
  };

  const handleDownload = () => {
    try {
      const svgElement = mermaidRef.current?.querySelector('svg');
      if (!svgElement) {
        toast.error("没有可下载的图表");
        return;
      }

      // Create a download link for SVG
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'mermaid-diagram.svg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("图表已下载");
    } catch (err) {
      console.error('Download error:', err);
      toast.error("下载失败");
    }
  };

  // 全屏切换
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 适应窗口大小
  const handleFitToScreen = () => {
    const container = containerRef.current;
    const svgElement = mermaidRef.current?.querySelector('svg');
    
    if (container && svgElement) {
      const containerRect = container.getBoundingClientRect();
      const svgRect = svgElement.getBoundingClientRect();
      
      const scaleX = containerRect.width / svgRect.width;
      const scaleY = containerRect.height / svgRect.height;
      const newZoom = Math.min(scaleX, scaleY, 1) * 0.9; // 留一些边距
      
      setZoom(newZoom);
      setTranslate({ x: 0, y: 0 });
    }
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-full'} flex flex-col`}>
      {/* 控制栏 - 固定高度 */}
      <div className="h-12 flex justify-between items-center px-2 flex-shrink-0">
        <h3 className="text-sm font-medium">Mermaid 图表</h3>
        <div className="flex gap-2">
          {/* 缩放控制 */}
          <div className="flex gap-0.5 border rounded-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="h-7 px-1.5"
              title="缩小"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <div className="flex items-center px-1.5 text-xs min-w-10 justify-center">
              {Math.round(zoom * 100)}%
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="h-7 px-1.5"
              title="放大"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* 适应窗口 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleFitToScreen}
            className="h-7 gap-1 text-xs px-2"
            title="适应窗口"
          >
            <Move className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">适应</span>
          </Button>

          {/* 下载按钮 */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!mermaidCode || isLoading || error}
            className="h-7 gap-1 text-xs px-2"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">下载</span>
          </Button>

          {/* 全屏模式下的退出按钮 */}
          {isFullscreen && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="h-7 gap-1 text-xs px-2"
              title="退出全屏"
            >
              <Minimize className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">退出</span>
            </Button>
          )}
        </div>
      </div>

      {/* 图表显示区域 - 占用剩余空间 */}
      <div className="flex-1 border rounded-lg relative min-h-0 bg-gray-50">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="text-muted-foreground">渲染中...</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center p-4">
              <p className="text-destructive mb-2">渲染失败</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}
        
        {!isLoading && !error && !mermaidCode && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground">请生成Mermaid代码以查看图表</p>
          </div>
        )}
        
        <div 
          ref={containerRef}
          className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none' }}
        >
          <div 
            ref={mermaidRef} 
            className="w-full h-full flex items-center justify-center p-4 transition-transform duration-150"
            style={{ 
              transform: `scale(${zoom}) translate(${translate.x / zoom}px, ${translate.y / zoom}px)`,
              minHeight: '100%'
            }}
          />
        </div>

        {/* 缩放和位移提示 */}
        {(zoom !== 1 || translate.x !== 0 || translate.y !== 0) && (
          <div className="absolute bottom-2 left-2 bg-background/90 border rounded px-2 py-1 text-xs">
            <span className="hidden sm:inline">缩放: {Math.round(zoom * 100)}% | Shift+滚轮缩放 | 拖拽移动</span>
            <span className="sm:hidden">{Math.round(zoom * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
} 