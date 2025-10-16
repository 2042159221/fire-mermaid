export async function POST(request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return Response.json({ error: "请提供密码" }, { status: 400 });
    }

    // 从环境变量获取正确的密码
    const correctPassword = process.env.ACCESS_PASSWORD;
    
    if (!correctPassword) {
      return Response.json({ error: "服务器未配置访问密码" }, { status: 500 });
    }

    // 验证密码
    const isValid = password === correctPassword;
    
    if (isValid) {
      return Response.json({ 
        success: true, 
        message: "密码验证成功" 
      });
    } else {
      return Response.json({ 
        success: false, 
        error: "密码错误" 
      }, { status: 401 });
    }
  } catch (error) {
    console.error("Password verification error:", error);
    return Response.json(
      { error: "密码验证时发生错误" }, 
      { status: 500 }
    );
  }
} 