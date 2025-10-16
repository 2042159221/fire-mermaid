import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 从环境变量读取模型配置
    const modelsConfig = process.env.AI_MODELS || '';
    
    if (!modelsConfig) {
      // 如果没有配置，返回默认模型
      const defaultModel = process.env.AI_MODEL_NAME || 'qwen3-coder';
      return NextResponse.json({
        success: true,
        models: [{
          id: defaultModel,
          name: defaultModel,
          description: '默认模型'
        }]
      });
    }

    // 解析模型配置（格式：模型ID:显示名称:描述）
    const models = modelsConfig.split(',').map(modelStr => {
      const parts = modelStr.trim().split(':');
      if (parts.length >= 2) {
        return {
          id: parts[0].trim(),
          name: parts[1].trim(),
          description: parts[2] ? parts[2].trim() : parts[1].trim()
        };
      }
      // 如果格式不正确，使用模型ID作为名称
      return {
        id: parts[0].trim(),
        name: parts[0].trim(),
        description: parts[0].trim()
      };
    }).filter(model => model.id); // 过滤掉空的模型ID

    return NextResponse.json({
      success: true,
      models: models
    });
  } catch (error) {
    console.error('Failed to get models:', error);
    return NextResponse.json(
      { success: false, error: '获取模型列表失败' },
      { status: 500 }
    );
  }
} 