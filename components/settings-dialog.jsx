"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Save, Key, Bot, RotateCcw } from "lucide-react";
import { verifyPassword, savePasswordState, isPasswordVerified, clearPasswordState, clearAIConfig } from "@/lib/config-service";

export function SettingsDialog({ open, onOpenChange, onPasswordVerified, onConfigUpdated }) {
  const [showPasswords, setShowPasswords] = useState({
    accessPassword: false,
    apiKey: false
  });
  
  // 表单状态
  const [accessPassword, setAccessPassword] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("");
  
  // 访问密码验证状态
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // 从localStorage加载配置
  useEffect(() => {
    if (open) {
      const savedConfig = localStorage.getItem('aiConfig');
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          setApiUrl(config.apiUrl || "");
          setApiKey(config.apiKey || "");
          setModelName(config.modelName || "");
        } catch (error) {
          console.error('Failed to load AI config:', error);
        }
      } else {
        // 如果没有保存的配置，清空表单
        setApiUrl("");
        setApiKey("");
        setModelName("");
      }
      
      // 检查访问密码验证状态
      const verified = isPasswordVerified();
      setPasswordVerified(verified);
    }
  }, [open]);

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handlePasswordSubmit = async () => {
    if (!enteredPassword.trim()) {
      toast.error("请输入密码");
      return;
    }

    setIsVerifying(true);

    try {
      const result = await verifyPassword(enteredPassword);
      
      if (result.success) {
        setPasswordVerified(true);
        savePasswordState(enteredPassword);
        toast.success("密码验证成功");
        
        // 通知父组件密码验证状态改变
        if (onPasswordVerified) {
          onPasswordVerified(true);
        }
      } else {
        toast.error(result.error || "密码错误");
      }
    } catch (error) {
      console.error("Password verification error:", error);
      toast.error("密码验证失败");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveAIConfig = () => {
    const config = {
      apiUrl: apiUrl.trim(),
      apiKey: apiKey.trim(),
      modelName: modelName.trim()
    };
    
    // 检查配置是否完整
    if (!config.apiUrl || !config.apiKey || !config.modelName) {
      toast.error("请填写完整的AI配置信息");
      return;
    }
    
    localStorage.setItem('aiConfig', JSON.stringify(config));
    toast.success("AI配置已保存");
    
    // 通知父组件配置已更新
    if (onConfigUpdated) {
      onConfigUpdated();
    }
  };

  const handleResetAIConfig = () => {
    // 清除localStorage中的AI配置
    clearAIConfig();
    
    // 清空表单
    setApiUrl("");
    setApiKey("");
    setModelName("");
    
    toast.success("AI配置已重置");
    
    // 通知父组件配置已更新
    if (onConfigUpdated) {
      onConfigUpdated();
    }
  };

  const resetPasswordVerification = () => {
    setPasswordVerified(false);
    setEnteredPassword("");
    clearPasswordState();
    toast.success("密码验证已重置");
    
    // 通知父组件密码验证状态改变
    if (onPasswordVerified) {
      onPasswordVerified(false);
    }
  };

  // 检查是否有AI配置
  const hasAIConfig = apiUrl.trim() || apiKey.trim() || modelName.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            系统设置
          </DialogTitle>
          <DialogDescription>
            配置系统访问权限和AI服务参数
            <div className="mt-2 p-2 bg-blue-50 rounded-md border-l-4 border-blue-400">
              <p className="text-sm text-blue-700">
                💡 解锁无限使用：①输入访问密码 或 ②配置您的AI服务。同时配置时优先使用AI服务。
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="password" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              访问密码
            </TabsTrigger>
            <TabsTrigger value="ai-config" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI配置
            </TabsTrigger>
          </TabsList>

          <TabsContent value="password" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">访问密码验证</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!passwordVerified ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="access-password">请输入访问密码</Label>
                      <div className="relative">
                        <Input
                          id="access-password"
                          type={showPasswords.accessPassword ? "text" : "password"}
                          value={enteredPassword}
                          onChange={(e) => setEnteredPassword(e.target.value)}
                          placeholder="输入访问密码"
                          disabled={isVerifying}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('accessPassword')}
                          disabled={isVerifying}
                        >
                          {showPasswords.accessPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button 
                      onClick={handlePasswordSubmit} 
                      className="w-full"
                      disabled={isVerifying || !enteredPassword.trim()}
                    >
                      {isVerifying ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-background mr-2"></div>
                          验证中...
                        </>
                      ) : (
                        "验证密码"
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full">
                      <Key className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-green-600">验证成功</h3>
                      <p className="text-sm text-muted-foreground">您已通过密码验证，享有无限使用权限</p>
                    </div>
                    <Button variant="outline" onClick={resetPasswordVerification}>
                      重置验证
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-config" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI服务配置</CardTitle>
                <p className="text-sm text-muted-foreground">配置您自己的AI服务，保存后即可享有无限使用权限</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-url">API URL</Label>
                  <Input
                    id="api-url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <div className="relative">
                    <Input
                      id="api-key"
                      type={showPasswords.apiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility('apiKey')}
                    >
                      {showPasswords.apiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model-name">模型名称</Label>
                  <Input
                    id="model-name"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveAIConfig} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    保存配置
                  </Button>
                  
                  {hasAIConfig && (
                    <Button 
                      variant="outline" 
                      onClick={handleResetAIConfig}
                      title="重置AI配置"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {hasAIConfig && (
                  <p className="text-xs text-muted-foreground">
                    点击重置按钮将清除所有AI配置，恢复使用默认服务
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 