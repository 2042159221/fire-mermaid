"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, Move, Maximize2 } from "lucide-react";

export function ZoomPanContainer({ 
  children, 
  className = "",
  onZoomChange,
  showControls = true,
  minZoom = 0.1,
  maxZoom = 5
}) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastPinchDistance, setLastPinchDistance] = useState(0);

  // 通知父组件缩放变化
  useEffect(() => {
    if (onZoomChange) {
      onZoomChange(zoom);
    }
  }, [zoom, onZoomChange]);

  // 缩放功能
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, maxZoom));
  }, [maxZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, minZoom));
  }, [minZoom]);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // 适应窗口大小
  const handleFitToView = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // 获取容器和内容的尺寸
    const containerRect = container.getBoundingClientRect();
    const content = container.querySelector('[data-zoomable-content]');
    
    if (content) {
      const contentRect = content.getBoundingClientRect();
      const scaleX = (containerRect.width * 0.9) / contentRect.width;
      const scaleY = (containerRect.height * 0.9) / contentRect.height;
      const newZoom = Math.min(scaleX, scaleY, 1);
      
      setZoom(Math.max(newZoom, minZoom));
      setTranslate({ x: 0, y: 0 });
    }
  }, [minZoom]);

  // 鼠标滚轮缩放
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom * delta));
      
      // 缩放到鼠标位置
      const zoomDiff = newZoom / zoom;
      setTranslate(prev => ({
        x: mouseX - (mouseX - prev.x) * zoomDiff,
        y: mouseY - (mouseY - prev.y) * zoomDiff
      }));
      
      setZoom(newZoom);
    }
  }, [zoom, minZoom, maxZoom]);

  // 触摸缩放
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      setLastPinchDistance(distance);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      if (lastPinchDistance > 0) {
        const scale = distance / lastPinchDistance;
        setZoom(prev => Math.max(minZoom, Math.min(maxZoom, prev * scale)));
      }
      
      setLastPinchDistance(distance);
    } else if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      setTranslate({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    }
  }, [lastPinchDistance, isDragging, dragStart, minZoom, maxZoom]);

  // 鼠标拖拽
  const handleMouseDown = useCallback((e) => {
    if (e.button === 0) { // 只响应左键
      setIsDragging(true);
      setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    }
  }, [translate]);

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

  // 事件监听器
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 添加事件监听器
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      
      if (isDragging) {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [isDragging, handleWheel, handleTouchStart, handleTouchMove, handleMouseMove, handleMouseUp]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch (e.key) {
        case '=':
        case '+':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoomIn();
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoomOut();
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoomReset();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleZoomReset]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* 缩放控制器 */}
      {showControls && (
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 bg-background/90 border rounded-md p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            className="h-8 w-8 p-0"
            title="放大 (Ctrl + +)"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          
          <div className="text-xs text-center px-1 py-1 min-w-12">
            {Math.round(zoom * 100)}%
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            className="h-8 w-8 p-0"
            title="缩小 (Ctrl + -)"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <div className="border-t my-1" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomReset}
            className="h-8 w-8 p-0"
            title="重置 (Ctrl + 0)"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFitToView}
            className="h-8 w-8 p-0"
            title="适应窗口"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 缩放和平移容器 */}
      <div 
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
      >
        <div 
          className="w-full h-full transition-transform duration-100 ease-out"
          style={{ 
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          {children}
        </div>
      </div>

      {/* 状态提示 */}
      {(zoom !== 1 || translate.x !== 0 || translate.y !== 0) && (
        <div className="absolute bottom-4 left-4 bg-background/90 border rounded px-3 py-1 text-xs">
          {zoom !== 1 && `缩放: ${Math.round(zoom * 100)}%`}
          {(translate.x !== 0 || translate.y !== 0) && zoom !== 1 && ' | '}
          {(translate.x !== 0 || translate.y !== 0) && '已移动'}
          <br />
          <span className="text-muted-foreground">
            Ctrl+滚轮缩放 | 拖拽移动 | Ctrl+0重置
          </span>
        </div>
      )}
    </div>
  );
} 