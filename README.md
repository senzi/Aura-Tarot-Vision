# 🐱 猫咪塔罗识别 Demo (Aura Tarot Vision)

这是一个基于 Vue 3 + Vite 配合 TensorFlow.js 构建的网页端塔罗牌实时识别应用。你可以直接使用手机浏览器（通过摄像头）扫描塔罗牌，应用会自动进行 AI 视觉识别。

---

## 🚀 本地开发与局域网手机调试

由于浏览器安全策略的限制，**调用摄像头 API (`navigator.mediaDevices.getUserMedia`) 必须在 HTTPS 环境或 `localhost` 下进行**。

如果你想用手机直接测试这个项目（你的电脑和手机需要连接**同一个 Wi-Fi**），请参考以下步骤：

### 1. 环境准备

确保你本地安装了 [Bun](https://bun.sh/)（你也可以使用 npm / pnpm / yarn，但本项目默认使用 bun 锁定依赖）。

### 2. 获取代码与依赖

```bash
# 1. 检出代码并进入目录
git clone <repository_url>
cd Aura-Tarot-Vision

# 2. 安装依赖包
bun install
```

### 3. 开启自带 HTTPS 支持的本地服务

项目依靠 `@vitejs/plugin-basic-ssl` 插件为大家免去了手动生成自签名证书的烦恼，并且也在 `vite.config.js` 开启了局域网透传（`host: true`）。

输入：

```bash
bun run dev
```

终端启动后，你会看到类似如下信息的输出：

```text
  VITE vX.X.X  ready in X ms

  ➜  Local:   https://localhost:5173/
  ➜  Network: https://192.168.X.X:5173/  <-- 重点看这里！
```

### 4. 手机端联调

1. 让你的手机与运行本服务的主机处于**同一局域网（同一 Wi-Fi）**。
2. 在手机的 Safari 或 Chrome 等主流浏览器中，直接输入启动提示里的 **Network 地址**（例如 `https://192.168.1.5:5173/`）。
3. **⚠️ 突破浏览器警告**：由于使用了 Vite 自动生成的自签名临时 HTTPS 证书，手机浏览器很大可能会拦截并显示“您的连接不是私密连接”、“证书不受信任”等警告。
   - **对于 iOS (Safari)**：点击下方的【显示详细信息】，然后点击【访问此网站】。
   - **对于 Android**：点击下方的【高级】，然后点击【继续前往...（不安全）】。
4. 成功进入页面后，浏览器会申请开启摄像头的权限，点击**允许**即可开始测试识别！

---

## 🛠️ 技术栈
- **框架**：Vue 3 (Composition API) + Vite
- **AI 引擎**：TensorFlow.js (@tensorflow/tfjs)
- **UI & 样式**：Tailwind CSS
