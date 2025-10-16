/**
 * 配置服务 - 管理AI配置和密码验证
 */

// 从API获取可用模型列表
export async function getAvailableModels() {
  try {
    const response = await fetch('/api/models');
    const data = await response.json();
    
    if (data.success) {
      return data.models;
    } else {
      console.error('Failed to get models:', data.error);
      // 返回默认模型
      return [{
        id: 'qwen3-coder',
        name: 'GPT-3.5 Turbo',
        description: '默认模型'
      }];
    }
  } catch (error) {
    console.error('Failed to fetch models:', error);
    // 返回默认模型
    return [{
      id: 'qwen3-coder',
      name: 'GPT-3.5 Turbo',
      description: '默认模型'
    }];
  }
}

// 获取AI配置，优先使用localStorage中的配置，否则使用环境变量
export function getAIConfig() {
  if (typeof window === 'undefined') {
    // 服务端：使用环境变量
    return {
      apiUrl: process.env.AI_API_URL || '',
      apiKey: process.env.AI_API_KEY || '',
      modelName: process.env.AI_MODEL_NAME || ''
    };
  }

  // 客户端：优先使用localStorage中的配置
  try {
    const savedConfig = localStorage.getItem('aiConfig');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      // 检查配置是否完整
      if (config.apiUrl && config.apiKey && config.modelName) {
        return config;
      }
    }
  } catch (error) {
    console.error('Failed to load AI config from localStorage:', error);
  }

  // 如果没有本地配置或配置不完整，使用环境变量
  return {
    apiUrl: process.env.NEXT_PUBLIC_AI_API_URL || '',
    apiKey: process.env.NEXT_PUBLIC_AI_API_KEY || '',
    modelName: process.env.NEXT_PUBLIC_AI_MODEL_NAME || 'qwen3-coder'
  };
}

// 检查是否有有效的AI配置
export function hasValidAIConfig() {
  const config = getAIConfig();
  return !!(config.apiUrl && config.apiKey && config.modelName);
}

// 检查用户是否有自定义AI配置（存储在localStorage中）
export function hasCustomAIConfig() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const savedConfig = localStorage.getItem('aiConfig');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      // 检查配置是否完整
      return !!(config.apiUrl && config.apiKey && config.modelName);
    }
  } catch (error) {
    console.error('Failed to load AI config from localStorage:', error);
  }
  
  return false;
}

// 保存AI配置到localStorage
export function saveAIConfig(config) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('aiConfig', JSON.stringify(config));
  }
}

// 清除本地AI配置
export function clearAIConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('aiConfig');
  }
}

// 模型选择相关函数

// 获取当前选择的模型
export function getSelectedModel() {
  if (typeof window === 'undefined') {
    return process.env.AI_MODEL_NAME || 'qwen3-coder'; // 使用环境变量中的默认模型
  }

  try {
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel) {
      return savedModel;
    }
  } catch (error) {
    console.error('Failed to load selected model from localStorage:', error);
  }
  
  return process.env.NEXT_PUBLIC_AI_MODEL_NAME || 'qwen3-coder'; // 默认模型
}

// 保存选择的模型
export function saveSelectedModel(modelId) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('selectedModel', modelId);
  }
}

// 获取模型信息（需要传入可用模型列表）
export function getModelInfo(modelId, availableModels = []) {
  const model = availableModels.find(m => m.id === modelId);
  return model || {
    id: modelId,
    name: modelId,
    description: modelId
  };
}

// 密码相关函数

// 验证密码（调用后端API）
export async function verifyPassword(password) {
  try {
    const response = await fetch('/api/verify-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Password verification failed:', error);
    return { success: false, error: '密码验证失败' };
  }
}

// 保存密码验证状态和密码
export function savePasswordState(password) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('passwordVerified', 'true');
    localStorage.setItem('accessPassword', password);
  }
}

// 获取保存的密码
export function getSavedPassword() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessPassword') || '';
  }
  return '';
}

// 检查密码是否已验证
export function isPasswordVerified() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('passwordVerified') === 'true';
  }
  return false;
}

// 清除密码验证状态
export function clearPasswordState() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('passwordVerified');
    localStorage.removeItem('accessPassword');
  }
}

// 检查用户是否享有无限量权限（密码验证通过或有自定义AI配置）
export function hasUnlimitedAccess() {
  return isPasswordVerified() || hasCustomAIConfig();
} 