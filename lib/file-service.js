import mammoth from "mammoth";

/**
 * Extracts text content from a file based on its type
 * @param {File} file - The file to extract text from
 * @returns {Promise<{text: string, error: string|null}>} - Extracted text or error
 */
export async function extractTextFromFile(file) {
  if (!file) {
    return { text: "", error: "未提供文件" };
  }

  try {
    const fileType = file.name.split('.').pop().toLowerCase();
    
    switch (fileType) {
      case 'txt':
        return extractTextFromTxt(file);
      
      case 'md':
        return extractTextFromTxt(file); // Markdown files can be read as plain text
      
      case 'docx':
        return extractTextFromDocx(file);
      
      default:
        return { text: "", error: `不支持的文件类型: ${fileType}` };
    }
  } catch (error) {
    console.error("File extraction error:", error);
    return { text: "", error: `文件处理错误: ${error.message}` };
  }
}

/**
 * Extracts text from a plain text file
 * @param {File} file - The text file
 * @returns {Promise<{text: string, error: string|null}>} - Extracted text
 */
async function extractTextFromTxt(file) {
  try {
    const text = await file.text();
    return { text, error: null };
  } catch (error) {
    console.error("Text file extraction error:", error);
    return { text: "", error: `文本文件处理错误: ${error.message}` };
  }
}

/**
 * Extracts text from a .docx file
 * @param {File} file - The .docx file
 * @returns {Promise<{text: string, error: string|null}>} - Extracted text
 */
async function extractTextFromDocx(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return { text: result.value, error: null };
  } catch (error) {
    console.error("DOCX extraction error:", error);
    return { text: "", error: `DOCX文件处理错误: ${error.message}` };
  }
} 