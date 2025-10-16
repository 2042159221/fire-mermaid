/**
 * Mermaid代码AI智能修复工具
 * 通过AI分析和修复Mermaid代码中的各种问题
 */

import { getAIConfig, getSavedPassword, getSelectedModel } from "./config-service";

/**
 * 使用AI自动修复Mermaid代码中的问题（流式处理）
 * @param {string} mermaidCode - 原始Mermaid代码
 * @param {string} errorMessage - 可选的错误信息，用于指导AI修复
 * @param {function} onChunk - 流式数据回调函数
 * @returns {Promise<{fixedCode: string, error: string|null}>} - 修复结果
 */
export async function autoFixMermaidCode(mermaidCode, errorMessage = null, onChunk = null) {
  if (!mermaidCode || typeof mermaidCode !== 'string') {
    return {
      fixedCode: mermaidCode,
      error: "无效的代码输入"
    };
  }

  try {
    // 获取AI配置
    const aiConfig = getAIConfig();
    const accessPassword = getSavedPassword();
    const selectedModel = getSelectedModel();

    const response = await fetch("/api/fix-mermaid", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mermaidCode,
        errorMessage,
        aiConfig,
        accessPassword,
        selectedModel
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "修复代码时出错");
    }

    // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullFixedCode = "";
    let buffer = ""; // Buffer to accumulate JSON data

    // Helper function to find complete JSON objects in buffer
    const findJsonObjectEnd = (str, startPos) => {
      let braceCount = 0;
      let inString = false;
      let escapeNext = false;

      for (let i = startPos; i < str.length; i++) {
        const char = str[i];

        if (escapeNext) {
          escapeNext = false;
          continue;
        }

        if (char === '\\') {
          escapeNext = true;
          continue;
        }

        if (char === '"') {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              return i;
            }
          }
        }
      }

      return -1;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete JSON objects in buffer
      let startPos = 0;
      let endPos;

      while ((endPos = findJsonObjectEnd(buffer, startPos)) !== -1) {
        try {
          const jsonStr = buffer.substring(startPos, endPos + 1);
          const data = JSON.parse(jsonStr);

          if (data.error) {
            throw new Error(data.error);
          }

          if (data.chunk && !data.done && onChunk) {
            // 收到新的代码片段，调用回调
            onChunk(data.chunk);
          }

          if (data.done && data.fixedCode) {
            // 流式接收完成，返回最终的完整代码
            fullFixedCode = data.fixedCode;
          }

          // Move start position for next JSON object
          startPos = endPos + 1;

        } catch (e) {
          console.error("Error parsing streaming chunk:", e, buffer.substring(startPos, endPos + 1));
          // Skip this malformed object
          startPos = endPos + 1;
        }
      }

      // Keep any remaining incomplete data in the buffer
      buffer = buffer.substring(startPos);
    }

    return {
      fixedCode: fullFixedCode || mermaidCode,
      error: null
    };
  } catch (error) {
    console.error("AI修复错误:", error);
    return {
      fixedCode: mermaidCode,
      error: error.message || "修复代码时发生未知错误"
    };
  }
}

/**
 * 切换图表方向 (TD <-> LR)
 * @param {string} mermaidCode - 原始Mermaid代码
 * @returns {string} - 切换方向后的代码
 */
export function toggleMermaidDirection(mermaidCode) {
  if (!mermaidCode || typeof mermaidCode !== 'string') {
    return mermaidCode;
  }

  let result = mermaidCode;

  // 查找并替换方向定义
  // 匹配 flowchart TD 或 graph TD 等
  result = result.replace(/(flowchart|graph)\s+(TD|TB|LR|RL)/gi, (_, type, direction) => {
    const newDirection = (direction.toUpperCase() === 'TD' || direction.toUpperCase() === 'TB') ? 'LR' : 'TD';
    return `${type} ${newDirection}`;
  });

  // 如果没有找到方向定义，尝试在第一行添加
  if (!result.match(/(flowchart|graph)\s+(TD|TB|LR|RL)/i)) {
    const lines = result.split('\n');
    if (lines.length > 0 && lines[0].trim() !== '') {
      // 检查第一行是否是图表类型声明
      if (lines[0].match(/^(flowchart|graph)$/i)) {
        lines[0] = `${lines[0]} TD`;
      } else if (!lines[0].match(/^(flowchart|graph)/i)) {
        // 如果第一行不是图表声明，添加一个
        lines.unshift('flowchart TD');
      }
      result = lines.join('\n');
    }
  }

  return result;
}
