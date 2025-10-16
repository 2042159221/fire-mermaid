export async function POST(request) {
  try {
    const { mermaidCode, aiConfig, accessPassword, selectedModel } = await request.json();

    if (!mermaidCode || typeof mermaidCode !== 'string') {
      return Response.json({ error: "请提供Mermaid代码" }, { status: 400 });
    }

    let finalConfig;
    const hasCompleteAiConfig = aiConfig?.apiUrl && aiConfig?.apiKey && aiConfig?.modelName;
    if (hasCompleteAiConfig) {
      finalConfig = { apiUrl: aiConfig.apiUrl, apiKey: aiConfig.apiKey, modelName: aiConfig.modelName };
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

    const url = finalConfig.apiUrl.includes("v1") || finalConfig.apiUrl.includes("v3")
      ? `${finalConfig.apiUrl}/chat/completions`
      : `${finalConfig.apiUrl}/v1/chat/completions`;

    const messages = [
      { role: "system", content: "你是资深的 Mermaid 代码优化专家。严格返回JSON，不要输出任何解释。" },
      { role: "user", content: [
        "基于以下Mermaid代码，输出最多8条可执行的优化建议，以JSON返回：",
        "- 每条建议包含 title(中文短标题) 与 instruction(简洁的执行指令)。",
        "- 只返回JSON：{\"suggestions\":[{\"title\":\"...\",\"instruction\":\"...\"}]}。",
        "- 领域示例：改进布局方向、合并重复节点、使用subgraph分组、添加classDef样式、规范边标签、优化节点命名/换行等。",
        "代码如下：\n```mermaid\n",
        mermaidCode,
        "\n```"
      ].join('\n') }
    ];

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${finalConfig.apiKey}` },
      body: JSON.stringify({ model: finalConfig.modelName, messages })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({ error: `AI服务返回错误 (${response.status})` }, { status: response.status });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let suggestions = [];
    try {
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonStr = content.slice(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed?.suggestions)) {
          suggestions = parsed.suggestions
            .filter(s => s && s.title && s.instruction)
            .slice(0, 8);
        }
      }
    } catch (_) {
      // ignore
    }

    // 兜底：若AI未按JSON返回，提供静态启发式建议
    if (suggestions.length === 0) {
      suggestions = [
        { title: "切换流程图方向", instruction: "将 flowchart 方向在 TD/LR 间切换以提高可读性" },
        { title: "相似节点合并命名", instruction: "合并重复或相似节点，统一命名与标签" },
        { title: "使用分组与子图", instruction: "引入 subgraph 对相关节点进行分组" },
        { title: "规范边标签格式", instruction: "统一使用 |label| 语法并补充缺失的边说明" },
        { title: "引入classDef样式", instruction: "为不同类型节点定义 classDef 并应用" }
      ];
    }

    return Response.json({ suggestions });
  } catch (error) {
    return Response.json({ error: `处理请求时发生错误: ${error.message}` }, { status: 500 });
  }
}



