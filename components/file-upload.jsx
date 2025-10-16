"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Upload, FileText, File } from "lucide-react";
import { extractTextFromFile } from "@/lib/file-service";
import { formatFileSize } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function FileUpload({ onTextExtracted }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0]; // Only process the first file
      
      // Check file type
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (!['txt', 'md', 'docx'].includes(fileExt)) {
        toast.error("不支持的文件类型。请上传 .txt, .md 或 .docx 文件。");
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("文件太大。请上传小于 10MB 的文件。");
        return;
      }

      setIsProcessing(true);
      
      try {
        const { text, error } = await extractTextFromFile(file);
        
        if (error) {
          toast.error(error);
          return;
        }
        
        if (!text || text.trim() === "") {
          toast.error("无法从文件中提取文本内容。");
          return;
        }
        
        toast.success(`已成功从 ${file.name} 提取文本`);
        onTextExtracted(text);
      } catch (error) {
        console.error("File processing error:", error);
        toast.error("处理文件时出错：" + error.message);
      } finally {
        setIsProcessing(false);
      }
    },
    [onTextExtracted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    disabled: isProcessing
  });

  return (
    <div
      {...getRootProps()}
      className={`h-full overflow-auto border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer
        ${isDragActive ? "border-primary bg-primary/5" : "border-border"}
        ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-2 text-center">
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <p>正在处理文件...</p>
          </>
        ) : (
          <>
            <div className="p-2 bg-primary/10 rounded-full">
              {isDragActive ? (
                <FileText className="h-6 w-6 text-primary" />
              ) : (
                <Upload className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              {isDragActive ? (
                <p className="font-medium">放下文件以上传</p>
              ) : (
                <>
                  <p className="font-medium">点击或拖放文件到此处上传</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    支持 .txt, .md, .docx 格式（最大 10MB）
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 