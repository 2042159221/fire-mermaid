export async function POST(request) {
  try {
    const { mermaidCode, errorMessage, aiConfig, accessPassword, selectedModel } = await request.json();

    if (!mermaidCode) {
      return Response.json({ error: "请提供需要修复的Mermaid代码" }, { status: 400 });
    }

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

    // 构建用户提示词，包含错误信息（如果有的话）
    let userPrompt = `请修复以下Mermaid代码中的问题。请直接返回修复后的代码，且不要返回其他的内容，也不要有修改说明的相关注释，并使用\`\`\`mermaid包裹。`;
    userPrompt += `
    mermaid代码为：
"${mermaidCode}"
`;

    // 如果有具体的错误信息，添加到提示词中
    if (errorMessage && errorMessage.trim()) {
      userPrompt += `
错误信息为：
"${errorMessage}"
`;
    }

    userPrompt += `你的主要修改思路是：
1. 分析错误信息，理解错误原因
2. 检查是否有特殊字符，如果有，使用引号包裹
3. 检查是否有关键字，如果有则使用别的字符代替
4. 修复其他问题
`;

    const messages = [
      {
        role: "system",
        content: "你是一个专业的Mermaid图表代码修复专家。你的任务是分析和修复Mermaid代码中的各种问题。",
      },
      {
        role: "user",
        content: userPrompt,
      },
    ];

    // 构建API URL
    const url = finalConfig.apiUrl.includes("v1") || finalConfig.apiUrl.includes("v3")
      ? `${finalConfig.apiUrl}/chat/completions`
      : `${finalConfig.apiUrl}/v1/chat/completions`;

    console.log('Using AI config for fix-mermaid:', {
      url,
      modelName: finalConfig.modelName,
      hasApiKey: !!finalConfig.apiKey,
    });

    // 创建一个流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
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
              stream: true, // 开启流式输出
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("AI API Error:", response.status, errorText);
            controller.enqueue(encoder.encode(JSON.stringify({
              error: `AI服务返回错误 (${response.status}): ${errorText || 'Unknown error'}`
            })));
            controller.close();
            return;
          }

          // 读取流式响应
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let mermaidCode = "";
          let dataBuffer = ""; // JSON 数据缓冲区，用于处理跨块的不完整 JSON

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 解析返回的数据块
            const chunk = decoder.decode(value, { stream: true });

            // 处理数据行
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
                    mermaidCode += content;
                    // 发送给客户端
                    controller.enqueue(encoder.encode(JSON.stringify({
                      chunk: content,
                      done: false
                    })));
                  }
                } catch (e) {
                  // JSON 解析失败，可能是不完整的数据
                  // 累积到缓冲区，等待下一个块
                  dataBuffer = jsonToParse;
                  
                  // 如果缓冲区过大（超过10KB），说明可能出错，清空并记录
                  if (dataBuffer.length > 10240) {
                    console.error('Error parsing chunk (buffer overflow):', e.message);
                    dataBuffer = "";
                  }
                }
              }
            }
          }

          // 提取代码块中的内容（如果有代码块标记）
          const fixedCode = parseAIResponse(mermaidCode, mermaidCode);

          // 发送完成信号
          controller.enqueue(encoder.encode(JSON.stringify({
            fixedCode: fixedCode,
            done: true
          })));

        } catch (error) {
          console.error("Streaming Error:", error);
          controller.enqueue(encoder.encode(JSON.stringify({
            error: `处理请求时发生错误: ${error.message}`,
            done: true
          })));
        } finally {
          controller.close();
        }
      }
    });

    // 返回流式响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
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

/**
 * 解析AI响应，提取修复后的代码
 */
function parseAIResponse(aiResponse, originalCode) {
  try {
    // 尝试提取代码块
    const codeBlockRegex = /```(?:mermaid)?\s*([\s\S]*?)\s*```/;
    const match = aiResponse.match(codeBlockRegex);

    let fixedCode = originalCode;

    if (match && match[1]) {
      fixedCode = match[1].trim();
    } else {
      // 如果没有找到代码块，尝试其他方式提取
      const lines = aiResponse.split('\n');
      const codeLines = lines.filter(line =>
        line.trim() &&
        !line.includes('修复') &&
        !line.includes('问题') &&
        !line.includes('说明') &&
        (line.includes('flowchart') || line.includes('graph') || line.includes('-->') || line.includes('[') || line.includes(']'))
      );

      if (codeLines.length > 0) {
        fixedCode = codeLines.join('\n').trim();
      }
    }

    return fixedCode;
  } catch (error) {
    console.error("解析AI响应时出错:", error);
    return originalCode;
  }
}
