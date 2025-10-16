import { cleanText } from "@/lib/utils";
import { buildMermaidSystemPrompt } from "@/lib/prompts/mermaid";

export async function POST(request) {
  try {
    const { text, diagramType, aiConfig, accessPassword, selectedModel } = await request.json();

    if (!text) {
      return Response.json({ error: "请提供文本内容" }, { status: 400 });
    }

    const cleanedText = cleanText(text);
    
    let finalConfig;
    
    // 步骤1: 检查是否有完整的aiConfig
    const hasCompleteAiConfig = aiConfig?.apiUrl && aiConfig?.apiKey && aiConfig?.modelName;
    
    if (hasCompleteAiConfig) {
      // 如果有完整的aiConfig，直接使用
      finalConfig = {
        apiUrl: aiConfig.apiUrl,
        apiKey: aiConfig.apiKey,
        modelName: aiConfig.modelName
      };
    } else {
      // 步骤2: 如果没有完整的aiConfig，则检验accessPassword
      if (accessPassword) {
        // 步骤3: 如果传入了accessPassword，验证是否有效
        const correctPassword = process.env.ACCESS_PASSWORD;
        const isPasswordValid = correctPassword && accessPassword === correctPassword;
        
        if (!isPasswordValid) {
          // 如果密码无效，直接报错
          return Response.json({ 
            error: "访问密码无效" 
          }, { status: 401 });
        }
      }
      
      // 如果没有传入accessPassword或者accessPassword有效，使用环境变量配置
      // 如果有选择的模型，使用选择的模型，否则使用默认模型
      finalConfig = {
        apiUrl: process.env.AI_API_URL,
        apiKey: process.env.AI_API_KEY,
        modelName: selectedModel || process.env.AI_MODEL_NAME
      };
    }

    // 检查最终配置是否完整
    if (!finalConfig.apiUrl || !finalConfig.apiKey || !finalConfig.modelName) {
      return Response.json({ 
        error: "AI配置不完整，请在设置中配置API URL、API Key和模型名称" 
      }, { status: 400 });
    }

    // 构建规范化的 system prompt（中文，按图类型约束）
    const systemPrompt = buildMermaidSystemPrompt({ diagramType: diagramType || "auto", language: "zh" });

    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: cleanedText,
      },
    ];

    // 构建API URL
    const url = finalConfig.apiUrl.includes("v1") || finalConfig.apiUrl.includes("v3") 
      ? `${finalConfig.apiUrl}/chat/completions` 
      : `${finalConfig.apiUrl}/v1/chat/completions`;
    
    console.log('Using AI config:', { 
      url, 
      modelName: finalConfig.modelName,
      hasApiKey: !!finalConfig.apiKey,
    });

    // 创建一个 SSE 流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (obj) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        };
        try {
          // 发送请求到 AI API (开启流式模式)
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${finalConfig.apiKey}`,
            },
            body: JSON.stringify({
              model: finalConfig.modelName,
              messages,
              stream: true,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("AI API Error:", response.status, errorText);
            sendEvent({ type: "error", message: `AI服务返回错误 (${response.status})`, ok: false });
            controller.close();
            return;
          }

          // 读取上游流式响应并增量提取 mermaid fenced code
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let pending = ""; // 待处理缓冲
          let mode = "search"; // search | collect | done
          let finalCollected = ""; // 最终代码
          let rawAll = ""; // 兜底：若未找到 fenced，则返回原始文本
          let dataBuffer = ""; // JSON 数据缓冲区，用于处理跨块的不完整 JSON

          const processIncoming = (text) => {
            const out = [];
            pending += text;
            while (true) {
              if (mode === "search") {
                const idxMer = pending.indexOf("```mermaid");
                const idxFence = pending.indexOf("```");
                let idx = -1;
                if (idxMer !== -1 && (idxFence === -1 || idxMer <= idxFence)) {
                  idx = idxMer;
                } else if (idxFence !== -1) {
                  idx = idxFence;
                }
                if (idx === -1) {
                  break; // 等待更多数据
                }
                const nlIdx = pending.indexOf("\n", idx);
                if (nlIdx === -1) {
                  break; // fence 行未完整
                }
                // 丢弃 fence 行及之前内容
                pending = pending.substring(nlIdx + 1);
                mode = "collect";
              } else if (mode === "collect") {
                const closeIdx = pending.indexOf("```");
                if (closeIdx === -1) {
                  if (pending.length > 0) {
                    out.push(pending);
                    pending = "";
                  }
                  break;
                }
                out.push(pending.substring(0, closeIdx));
                pending = pending.substring(closeIdx + 3);
                mode = "done";
              } else {
                break;
              }
            }
            return out;
          };

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });

            // OpenAI 风格 SSE：逐行解析 data: 行
            const lines = chunk.split('\n');
            for (const line of lines) {
              const trimmedLine = line.trim();
              
              // 跳过空行
              if (!trimmedLine) {
                continue;
              }
              
              if (trimmedLine.startsWith('data: ')) {
                const data = trimmedLine.substring(6).trim();
                
                // 跳过空数据和结束标记
                if (!data || data === '[DONE]') {
                  dataBuffer = ""; // 清空缓冲区
                  continue;
                }
                
                // 尝试解析 JSON，如果失败则累积到缓冲区
                const jsonToParse = dataBuffer + data;
                try {
                  const parsed = JSON.parse(jsonToParse);
                  dataBuffer = ""; // 解析成功，清空缓冲区
                  
                  const content = parsed.choices[0]?.delta?.content || '';
                  if (content) {
                    rawAll += content;
                    const increments = processIncoming(content);
                    if (increments.length > 0) {
                      for (const inc of increments) {
                        finalCollected += inc;
                        sendEvent({ type: 'chunk', data: inc });
                      }
                    }
                  }
                } catch (e) {
                  // JSON 解析失败，可能是不完整的数据
                  // 累积到缓冲区，等待下一个块
                  dataBuffer = jsonToParse;
                  
                  // 如果缓冲区过大（超过10KB），说明可能出错，清空并记录
                  if (dataBuffer.length > 10240) {
                    console.error('Error parsing upstream chunk (buffer overflow):', e.message);
                    dataBuffer = "";
                  }
                }
              }
            }
          }

          // 基础语法验证（可选增强）
          const validateMermaidSyntax = (code) => {
            const warnings = [];
            const lines = code.split('\n');
            
            // 检查括号配对
            let squareBrackets = 0;
            let curlyBrackets = 0;
            let parentheses = 0;
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line || line.startsWith('%%')) continue; // 跳过空行和注释
              
              // 统计括号
              for (const char of line) {
                if (char === '[') squareBrackets++;
                else if (char === ']') squareBrackets--;
                else if (char === '{') curlyBrackets++;
                else if (char === '}') curlyBrackets--;
                else if (char === '(') parentheses++;
                else if (char === ')') parentheses--;
              }
              
              // 检查常见错误模式：同行多个节点定义
              const nodeMatches = line.match(/\w+\[/g);
              if (nodeMatches && nodeMatches.length > 1) {
                // 排除箭头中的情况，如 A --> B[文本]
                if (!line.includes('-->') && !line.includes('-.->') && !line.includes('==>')) {
                  warnings.push(`Line ${i + 1}: 检测到可能的多节点连写`);
                }
              }
            }
            
            // 报告不配对的括号
            if (squareBrackets !== 0) {
              warnings.push(`方括号不配对：${squareBrackets > 0 ? '缺少' + squareBrackets + '个]' : '多余' + Math.abs(squareBrackets) + '个]'}`);
            }
            if (curlyBrackets !== 0) {
              warnings.push(`花括号不配对：${curlyBrackets > 0 ? '缺少' + curlyBrackets + '个}' : '多余' + Math.abs(curlyBrackets) + '个}'}`);
            }
            if (parentheses !== 0) {
              warnings.push(`圆括号不配对：${parentheses > 0 ? '缺少' + parentheses + '个)' : '多余' + Math.abs(parentheses) + '个)'}`);
            }
            
            return warnings;
          };
          
          const finalCode = finalCollected.trim() || rawAll.trim();
          
          // 执行验证并记录警告（不阻止输出）
          if (finalCode) {
            const warnings = validateMermaidSyntax(finalCode);
            if (warnings.length > 0) {
              console.warn('Mermaid 语法验证警告:', warnings.join('; '));
            }
          }
          
          sendEvent({ type: 'final', data: finalCode, ok: true });
        } catch (error) {
          console.error("Streaming Error:", error);
          const safeMsg = error?.message || '未知错误';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: `处理请求时发生错误: ${safeMsg}`, ok: false })}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    // 返回 SSE 流式响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error("API Route Error:", error);
    return Response.json(
      { error: `处理请求时发生错误: ${error.message}` }, 
      { status: 500 }
    );
  }
} 