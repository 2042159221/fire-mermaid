import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Cleans text input for better AI processing
 * @param {string} text - The input text to clean
 * @returns {string} - Cleaned text
 */
export function cleanText(text) {
  if (!text) return "";
  
  // Remove excessive whitespace
  let cleanedText = text.replace(/\s+/g, " ");
  
  // Trim leading/trailing whitespace
  cleanedText = cleanedText.trim();
  
  return cleanedText;
}

/**
 * Counts characters in a string
 * @param {string} text - Text to count
 * @returns {number} - Character count
 */
export function countCharacters(text) {
  return text ? text.length : 0;
}

/**
 * Validates if text is within the character limit
 * @param {string} text - Text to validate
 * @param {number} limit - Maximum character limit
 * @returns {boolean} - Whether text is within limit
 */
export function isWithinCharLimit(text, limit) {
  return countCharacters(text) <= limit;
}

/**
 * Formats byte size to human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size (e.g., "2.5 MB")
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Truncates text to a specific length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} - Truncated text
 */
export function truncateText(text, length = 100) {
  if (!text) return "";
  if (text.length <= length) return text;
  
  return text.substring(0, length) + "...";
}

/**
 * Copies text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
export async function copyToClipboard(text) {
  // 检查是否支持现代 Clipboard API
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error("Failed to copy text using Clipboard API:", error);
      // 如果 Clipboard API 失败，尝试降级方案
      return fallbackCopyToClipboard(text);
    }
  } else {
    // 浏览器不支持 Clipboard API，使用降级方案
    return fallbackCopyToClipboard(text);
  }
}

/**
 * 降级复制方案 - 使用 execCommand (适用于旧浏览器或非HTTPS环境)
 * @param {string} text - Text to copy
 * @returns {boolean} - Success status
 */
function fallbackCopyToClipboard(text) {
  try {
    // 创建一个临时的 textarea 元素
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // 设置样式使其不可见
    textArea.style.position = "fixed";
    textArea.style.top = "-9999px";
    textArea.style.left = "-9999px";
    textArea.style.opacity = "0";
    
    document.body.appendChild(textArea);
    
    // 选择文本
    textArea.focus();
    textArea.select();
    
    // 尝试复制
    let successful = false;
    try {
      successful = document.execCommand('copy');
    } catch (err) {
      console.error("execCommand('copy') failed:", err);
    }
    
    // 清理临时元素
    document.body.removeChild(textArea);
    
    return successful;
  } catch (error) {
    console.error("Fallback copy failed:", error);
    return false;
  }
}
