"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { FileCode2, Github, Settings, Plus } from "lucide-react";

export function Header({ 
  remainingUsage = 0, 
  usageLimit = parseInt(process.env.NEXT_PUBLIC_DAILY_USAGE_LIMIT || "5"), 
  onSettingsClick, 
  onContactClick,
  isPasswordVerified = false,
  hasCustomConfig = false 
}) {
  const hasUnlimitedAccess = isPasswordVerified || hasCustomConfig;

  return (
    <header className="border-b">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-6 w-6" />
          <span className="text-lg font-bold">Fire Mermaid</span>
          <span className="text-sm font-bold">简化您的图表创作</span>

        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {hasUnlimitedAccess ? (
              <span className="text-green-600 font-semibold">无限量</span>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onContactClick}
                  title="联系作者获取更多使用次数"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                剩余: <span className={remainingUsage <= 1 ? "text-red-500 font-bold" : "text-green-600 font-semibold"}>{remainingUsage}</span>/{usageLimit}
              </>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onSettingsClick}
            title="设置"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <a 
            href="https://github.com/2042159221/fire-mermaid"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80"
          >
            <Github className="h-5 w-5" />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
} 