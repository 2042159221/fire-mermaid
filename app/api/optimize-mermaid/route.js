import { getAIConfig, getSavedPassword, getSelectedModel } from "@/lib/config-service";

export async function POST(request) {
  try {
    const { mermaidCode, instruction, aiConfig, accessPassword, selectedModel } = await request.json();

    if (!mermaidCode || typeof mermaidCode !== 'string') {
      return Response.json({ error: "请提供需要优化的Mermaid代码" }, { status: 400 });
    }

    let finalConfig;

    // 与其他路由一致的配置分支
    const hasCompleteAiConfig = aiConfig?.apiUrl && aiConfig?.apiKey && aiConfig?.modelName;
    if (hasCompleteAiConfig) {
      finalConfig = {
        apiUrl: aiConfig.apiUrl,
        apiKey: aiConfig.apiKey,
        modelName: aiConfig.modelName
      };
    } else {
      if (accessPassword) {
        const correctPassword = process.env.ACCESS_PASSWORD;
        const isPasswordValid = correctPassword && accessPassword === correctPassword;
        if (!isPasswordValid) {
          return Response.json({ error: "访问密码无效" }, { status: 401 });
        }
      }
      finalConfig = {
        apiUrl: process.env.AI_API_URL,
        apiKey: process.env.AI_API_KEY,
        modelName: selectedModel || process.env.AI_MODEL_NAME
      };
    }

    if (!finalConfig.apiUrl || !finalConfig.apiKey || !finalConfig.modelName) {
      return Response.json({ error: "AI配置不完整，请在设置中配置API URL、API Key和模型名称" }, { status: 400 });
    }

    // 系统提示词：仅输出一个 mermaid fenced code，禁止添加解释
    const systemPrompt = [
      "你是资深的 Mermaid 代码优化专家。",
      "目标：在不改变语义的前提下，提升可读性、布局稳定性与一致性。",
      "允许：合理的方向(flowchart TD/LR 切换)、节点命名规范化(显示文本不变)、subgraph 分组、classDef 样式、边标签规整。",
      "禁止：凭空增加/删除实体或关系；输出额外解释；输出多于一个代码块。",
      "输出契约：仅输出一个以 mermaid 标注的 fenced code block。"
    ].join('\n');

    const userParts = [
      "请优化以下 Mermaid 代码：",
      "```mermaid",
      mermaidCode,
      "```"
    ];
    if (instruction && String(instruction).trim()) {
      userParts.push("附加优化需求：\n" + String(instruction).trim());
    }
    userParts.push("仅输出优化后的一个 mermaid fenced code。");

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userParts.join('\n') }
    ];

    const url = finalConfig.apiUrl.includes("v1") || finalConfig.apiUrl.includes("v3")
      ? `${finalConfig.apiUrl}/chat/completions`
      : `${finalConfig.apiUrl}/v1/chat/completions`;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (obj) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        };
        try {
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
            sendEvent({ type: "error", message: `AI服务返回错误 (${response.status})`, ok: false });
            controller.close();
            return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let pending = "";
          let mode = "search"; // search | collect | done
          let finalCollected = "";
          let rawAll = "";
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
                if (idx === -1) break;
                const nlIdx = pending.indexOf("\n", idx);
                if (nlIdx === -1) break;
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
                    console.error('Error parsing optimize chunk (buffer overflow):', e.message);
                    dataBuffer = "";
                  }
                }
              }
            }
          }

          const finalCode = (finalCollected.trim() || rawAll.trim());
          sendEvent({ type: 'final', data: finalCode, ok: true });
        } catch (error) {
          const safeMsg = error?.message || '未知错误';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: `处理请求时发生错误: ${safeMsg}`, ok: false })}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    return Response.json(
      { error: `处理请求时发生错误: ${error.message}` },
      { status: 500 }
    );
  }
}



