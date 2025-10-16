/**
 * Build the system prompt for generating Mermaid diagrams.
 * The template is modular and avoids unnecessary decorations (no triple quotes, etc.).
 *
 * @param {Object} params
 * @param {('auto'|'flowchart'|'sequence'|'class')} params.diagramType
 * @param {('zh'|'en')} [params.language='zh']
 * @param {Object} [params.limits]
 * @param {number} [params.limits.maxNodes=40]
 * @param {number} [params.limits.maxEdges=80]
 * @param {Object} [params.style]
 * @param {('TD'|'LR'|'BT'|'RL')} [params.style.flowDirection='TD']
 * @returns {string}
 */
export function buildMermaidSystemPrompt({ diagramType = 'auto', language = 'zh', limits = {}, style = {} } = {}) {
  const maxNodes = Number.isFinite(limits.maxNodes) ? limits.maxNodes : 40;
  const maxEdges = Number.isFinite(limits.maxEdges) ? limits.maxEdges : 80;
  const flowDirection = style.flowDirection || 'TD';

  const isZH = language === 'zh';

  const sectionTitle = (zh, en) => (isZH ? zh : en);

  const goals = isZH
    ? `目的与目标：\n- 将用户输入准确映射为可编译的 Mermaid 图。\n- 覆盖关键实体/步骤与关系，保持清晰、可读、无冗余。`
    : `Goals:\n- Map user input into a compilable Mermaid diagram.\n- Cover key entities/steps and relations; keep it clear and readable.`;

  const typeRule = (() => {
    if (diagramType && diagramType !== 'auto') {
      if (isZH) {
        return `图类型：\n- 必须使用 ${diagramType} 类型（不得更换类型）。`;
      }
      return `Diagram type:\n- You MUST use type ${diagramType} (do not switch types).`;
    }
    if (isZH) {
      return `图类型：\n- 根据内容选择最合适的一种：flowchart、sequence 或 class（仅一种）。`;
    }
    return `Diagram type:\n- Choose exactly one best fit: flowchart, sequence, or class.`;
  })();

  const syntaxRules = isZH
    ? `语法与转义：
- 节点 ID 不包含空格与特殊字符；展示文本使用方括号包裹。
- **重要**：每个节点必须独立完整定义，每行只能定义一个节点。
  格式：节点ID[节点文本]
  ❌ 错误示例：A[节点1 B[节点2]  （连写，缺少闭合）
  ❌ 错误示例：A[节点1]B[节点2]  （同行多个节点）
  ✅ 正确示例：
    A[节点1]
    B[节点2]
    A --> B
- HTML 特殊字符 < > & # 使用实体编码（&lt; &gt; &amp; &#35;）。
- 使用 %% 表示注释；边标签使用 |label| 语法。
- 若使用 flowchart，默认方向为 ${flowDirection}（示例：flowchart ${flowDirection}）。`
    : `Syntax & Escaping:
- Node IDs contain no spaces/special chars; show text inside brackets.
- **Important**: Each node must be defined independently and completely, one per line.
  Format: NodeID[NodeText]
  ❌ Wrong: A[Node1 B[Node2]  (connected, missing closure)
  ❌ Wrong: A[Node1]B[Node2]  (multiple nodes on same line)
  ✅ Correct:
    A[Node1]
    B[Node2]
    A --> B
- HTML special chars < > & # must be HTML-encoded (&lt; &gt; &amp; &#35;).
- Use %% for comments; edge labels use |label| syntax.
- If using flowchart, default direction is ${flowDirection} (e.g., flowchart ${flowDirection}).`;

  const styleGuidelines = isZH
    ? `风格与复杂度：\n- 节点不超过 ${maxNodes} 个、边不超过 ${maxEdges} 条；超限请抽象/分组（subgraph）。\n- 如需颜色/层级区分，应使用 classDef/class：\n  示例：\n  classDef group fill:#eef,stroke:#55f;\n  class A,B group`
    : `Style & Complexity:\n- Up to ${maxNodes} nodes and ${maxEdges} edges; if exceeded, abstract/group with subgraph.\n- For color/hierarchy, use classDef/class:\n  Example:\n  classDef group fill:#eef,stroke:#55f;\n  class A,B group`;

  const outputContract = isZH
    ? (
      '输出格式（严格）：\n' +
      '- 仅输出一个以 mermaid 标注的 fenced code block（' + '```' + 'mermaid 开始，' + '```' + ' 结束）。\n' +
      '- 不得包含任何额外文字、解释或前后缀。'
    ) : (
      'Output contract (strict):\n' +
      '- Output exactly one fenced code block labeled mermaid (' + '```' + 'mermaid ... ' + '```' + ').\n' +
      '- No extra text, explanations, or wrappers.'
    );

  const selfCheck = isZH
    ? `自检（不要输出自检过程）：\n- 关键实体/步骤是否覆盖？主要关系是否完整？\n- Mermaid 语法是否可编译？是否只包含一个 mermaid fenced code？`
    : `Self-check (do not output):\n- Are key entities/steps covered and relations complete?\n- Does it compile as Mermaid? Exactly one mermaid fenced code?`;

  const microExamples = (() => {
    if (isZH) {
      return [
        '示例（极简）：',
        '- flowchart：',
        '```mermaid',
        'flowchart ' + flowDirection,
        'A[开始] --> B[处理]',
        'B --> C{分支}',
        'C -->|是| D[成功]',
        'C -->|否| E[失败]',
        '```',
        '- sequence：',
        '```mermaid',
        'sequenceDiagram',
        'Alice->>Bob: 请求',
        'Bob-->>Alice: 响应',
        '```',
        '- class：',
        '```mermaid',
        'classDiagram',
        'class User {',
        '  +id: string',
        '  +name: string',
        '}',
        'User <|-- Admin',
        '```'
      ].join('\n');
    }
    return [
      'Examples (minimal):',
      '- flowchart:',
      '```mermaid',
      'flowchart ' + flowDirection,
      'A[Start] --> B[Process]',
      'B --> C{Branch}',
      'C -->|Yes| D[Success]',
      'C -->|No| E[Fail]',
      '```',
      '- sequence:',
      '```mermaid',
      'sequenceDiagram',
      'Alice->>Bob: Request',
      'Bob-->>Alice: Response',
      '```',
      '- class:',
      '```mermaid',
      'classDiagram',
      'class User {',
      '  +id: string',
      '  +name: string',
      '}',
      'User <|-- Admin',
      '```'
    ].join('\n');
  })();

  const sections = [
    sectionTitle('目的与目标', 'Goals'),
    goals,
    '',
    sectionTitle('图类型规则', 'Diagram Type Rule'),
    typeRule,
    '',
    sectionTitle('语法与转义', 'Syntax & Escaping'),
    syntaxRules,
    '',
    sectionTitle('风格与复杂度', 'Style & Complexity'),
    styleGuidelines,
    '',
    sectionTitle('输出格式', 'Output Contract'),
    outputContract,
    '',
    sectionTitle('自检清单', 'Self-checklist'),
    selfCheck,
    '',
    sectionTitle('示例', 'Examples'),
    microExamples,
  ];

  return sections.join('\n');
}


