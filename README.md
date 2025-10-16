# Fire Mermaid 🔥

基于 AI 的 Mermaid 图表生成和优化工具。

## 功能特性

- 🤖 AI 驱动的图表生成
- 📝 文本/文件输入支持
- 🎨 多种图表类型支持
- 🔧 智能图表修复和优化
- 💾 历史记录管理
- 🌓 深色/浅色主题
- 🔐 访问密码保护
- 📊 使用限额控制

## 快速开始

### Docker 部署（推荐）

1. **克隆项目**
```bash
git clone <your-repo-url>
cd fire-mermaid
```

2. **配置环境变量**
```bash
# 复制环境变量模板
cp env.template .env

# 编辑 .env 文件，填入你的配置
# 至少需要配置：
# - ACCESS_PASSWORD（访问密码）
# - AI_API_URL（AI API 地址）
# - AI_API_KEY（AI API 密钥）
# - AI_MODEL_NAME（AI 模型名称）
```

3. **启动服务**
```bash
docker-compose up -d
```

4. **访问应用**
```
http://localhost:3000
```

详细的 Docker 部署指南请查看 [DOCKER_DEPLOY.md](./DOCKER_DEPLOY.md)

### 本地开发

1. **安装依赖**
```bash
npm install
```

2. **配置环境变量**
```bash
# 创建 .env.local 文件
cp env.template .env.local
# 编辑并填入配置
```

3. **启动开发服务器**
```bash
npm run dev
```

4. **访问应用**
```
http://localhost:3000
```

## 环境变量配置

### 必需配置

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `ACCESS_PASSWORD` | 访问密码 | `my_secure_password` |
| `AI_API_URL` | AI API 地址 | `https://api.openai.com/v1/chat/completions` |
| `AI_API_KEY` | AI API 密钥 | `sk-xxxxxxxx` |
| `AI_MODEL_NAME` | AI 模型名称 | `qwen3-coder` |

### 可选配置

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NEXT_PUBLIC_DAILY_USAGE_LIMIT` | 每日使用限制 | `5` |
| `NEXT_PUBLIC_MAX_CHARS` | 最大字符数 | `20000` |
| `AI_MAX_TOKENS` | AI 生成最大 Token 数（所有场景默认值） | `8192` |
| `AI_MAX_TOKENS_GENERATE` | 生成图表场景专用 Token 限制 | `8192` |
| `AI_MAX_TOKENS_OPTIMIZE` | 优化图表场景专用 Token 限制 | `8192` |
| `AI_MAX_TOKENS_SUGGESTIONS` | 生成建议场景专用 Token 限制 | `4096` |

#### Max Tokens 配置说明

Max Tokens 用于控制 AI 生成内容的最大长度，防止图表被截断。

- **推荐值**: 生成和优化场景使用 `8192`，建议场景使用 `4096`
- **调整建议**: 如果仍然出现截断，可以适当增加（如 `16384`），但会增加 API 调用成本
- **配置优先级**: 场景专用配置 > 默认配置 (`AI_MAX_TOKENS`)
- **重要提示**: 已优化流式处理逻辑和 Prompt，使用引号语法提高生成质量

更多配置说明请查看 [env.template](./env.template)

## 技术栈

- **框架**: Next.js 14 (App Router)
- **UI 组件**: Radix UI
- **样式**: Tailwind CSS
- **图表渲染**: Mermaid.js
- **AI 集成**: OpenAI API (兼容其他 API)
- **部署**: Docker

## 项目结构

```
fire-mermaid/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── generate-mermaid/
│   │   ├── optimize-mermaid/
│   │   ├── fix-mermaid/
│   │   ├── models/
│   │   └── verify-password/
│   ├── layout.js
│   └── page.js
├── components/            # React 组件
│   ├── ui/               # UI 基础组件
│   ├── mermaid-editor.jsx
│   ├── mermaid-renderer.jsx
│   └── ...
├── lib/                  # 工具库
│   ├── ai-service.js
│   ├── config-service.js
│   ├── history-service.js
│   └── prompts/
├── public/               # 静态资源
├── Dockerfile            # Docker 镜像配置
├── docker-compose.yml    # Docker Compose 配置
└── env.template          # 环境变量模板
```

## 使用说明

### 1. 生成图表

- **文本输入**: 在文本框中输入图表描述
- **文件上传**: 上传文本文件或代码文件
- 选择图表类型（流程图、时序图等）
- 点击"生成图表"

### 2. 优化图表

- 在已生成的图表上点击"优化"
- AI 会分析并提供优化建议
- 应用建议或手动修改

### 3. 修复图表

- 如果图表渲染错误
- 点击"修复"按钮
- AI 会自动修复语法错误

### 4. 历史记录

- 所有生成的图表会保存在历史记录中
- 点击历史记录可快速恢复
- 支持删除单个或清空所有记录

## 常见问题

### Docker 部署提示"服务器未配置访问密码"

**原因**: 环境变量未正确传递到容器

**解决方法**:
1. 确保项目根目录有 `.env` 文件
2. 检查 `.env` 文件中有 `ACCESS_PASSWORD=xxx`
3. 重启容器: `docker-compose restart`

详细解决方案请查看 [DOCKER_DEPLOY.md](./DOCKER_DEPLOY.md#q1-提示服务器未配置访问密码)

### AI 功能不可用

**原因**: AI 配置缺失或错误

**解决方法**:
1. 检查 `.env` 文件中的 AI 配置
2. 确保 API Key 有效且有足够额度
3. 检查 API URL 是否正确

### 如何使用自己的 AI API

支持任何兼容 OpenAI API 格式的服务:

- **OpenAI**: 官方 API
- **Azure OpenAI**: 微软 Azure 服务
- **Ollama**: 本地运行的 LLM
- **LocalAI**: 本地 AI 服务
- 其他兼容服务

只需在 `.env` 文件中配置相应的 `AI_API_URL`、`AI_API_KEY` 和 `AI_MODEL_NAME`

## 开发

### 构建生产版本

```bash
npm run build
npm start
```

### 代码检查

```bash
npm run lint
```

### Docker 本地构建

```bash
# 构建镜像
docker build -t fire-mermaid .

# 运行容器
docker run -p 3000:3000 --env-file .env fire-mermaid
```

## 部署

### Docker Compose（推荐）

```bash
docker-compose up -d
```

### Docker

```bash
docker build -t fire-mermaid .
docker run -d -p 3000:3000 --env-file .env fire-mermaid
```

### Vercel/Netlify

1. Fork 此项目
2. 在平台上导入项目
3. 配置环境变量
4. 部署

## 安全建议

1. ✅ 使用强密码（建议 20+ 字符）
2. ✅ 不要在 `NEXT_PUBLIC_*` 变量中存储敏感信息
3. ✅ 定期轮换 API Key
4. ✅ 设置 API 使用限额
5. ✅ 生产环境使用 HTTPS
6. ❌ 不要提交 `.env` 文件到 Git

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

## 支持

如有问题，请查看:
- [DOCKER_DEPLOY.md](./DOCKER_DEPLOY.md) - Docker 部署详细指南
- [env.template](./env.template) - 环境变量配置说明
- Issues - 提交问题或建议

