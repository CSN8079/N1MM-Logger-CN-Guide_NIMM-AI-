# N1MM Logger+ 中文实践指南（自动检测 · 个性化 · DeepSeek AI 助手）

一个可在**任意 Windows 电脑**上直接运行的本地网站：双击启动后，本地服务器会自动检测该电脑上的 N1MM Logger+ 安装信息、用户数据目录、数据库与 TQSL 状态，并据此显示**针对当前使用者的路径、版本与下一步建议**；页面右下角内置 DeepSeek AI 助手，可结合本机环境回答初次设置、比赛日志、多地点共用日志与 ARRL LoTW/TQSL 上传等问题。

> 本指南由业余无线电爱好者整理，不隶属于 N1MM Logger+ 或 ARRL。软件界面、比赛规则与 LoTW 政策可能更新，请以官方最新说明为准。

## 功能特点

- **自动检测本机环境**：通过本地服务器 `GET /api/detect` 读取注册表与常见路径，识别 N1MM Logger+ 版本、程序目录、用户数据目录、`.s3db` 数据库、`ExportFiles`、INI 中的呼号/最近比赛，以及 TQSL 安装状态。
- **个性化显示与指导**：页面顶部与环境卡片会显示检测结果，并给出“下一步做什么”的建议（例如：还没有个人数据库 → 建议 `File > New Database…`；未检测到 TQSL → 提示安装）。
- **AI 结合本机环境**：聊天的系统提示中会加入经过脱敏的本机环境（目录用 `~` 代替用户名），让 DeepSeek 直接告诉你该点哪个菜单、哪个目录。
- **无 API Key 也能用**：内置 23 条 N1MM/LoTW 知识库；未配置 Key 时自动退回到本地知识库检索并给出官方链接。
- **跨平台启动脚本**：Windows 用 `启动网站.bat`；macOS/Linux 用 `start.sh`（N1MM Logger+ 本身是 Windows 软件，非 Windows 平台上检测会显示“未安装”，教程仍可阅读）。
- **只监听本机回环地址**：服务器绑定 `127.0.0.1`，`/api/*` 会校验 Host/Origin，非本机来源返回 403。

## 快速开始

### Windows（推荐）

1. 确认已安装 **Node.js 18+**（<https://nodejs.org/>，安装 LTS 版即可）。
2. 双击 **`启动网站.bat`**。
3. 浏览器自动打开 <http://127.0.0.1:8765/>；页面会自动检测本机 N1MM 环境。
4. 点右下角 **AI 助手 → ⚙**，粘贴 DeepSeek API Key（在 <https://platform.deepseek.com/> 创建），保存后即可提问。
5. 关闭那个命令行窗口即停止服务。

### macOS / Linux

```bash
chmod +x start.sh
./start.sh
```

### 手动运行

```bash
node server.mjs            # 默认 8765 端口，自动打开浏览器
node server.mjs --no-open  # 不自动打开浏览器
node server.mjs --port 9000
```

### 不想安装 Node.js？

直接双击 `index.html` 也能阅读全部教程、使用内置知识库与 DeepSeek 直连模式；但浏览器出于安全原因**禁止网页读取本机路径**，此时自动检测不可用，页面会提示你手动填写呼号/网格。要获得“自动检测 + 个性化”，请用上面的本地服务器方式打开。

## 自动检测会读取什么？

`server.mjs` 的 `GET /api/detect` 会在本机执行以下检测（只读）：

| 项目 | 来源 |
|---|---|
| N1MM Logger+ 是否安装、版本、安装目录 | 注册表卸载项（HKLM/HKCU，含 WOW6432Node）+ `C:\Program Files (x86)\N1MM Logger+` 等常见路径 |
| 用户数据目录 | 注册表“文档”位置（支持 OneDrive 重定向）、`Documents\N1MM Logger+\`、`OneDrive\Documents\N1MM Logger+\`、`%APPDATA%`、`%LOCALAPPDATA%`、安装目录 |
| 数据库 | 用户数据目录下 `Databases\*.s3db` 的**文件名**、大小、修改时间，并区分 N1MM 系统库（Admin/DXLog/Packet Spots）与个人库 |
| 导出文件 | `ExportFiles` 中的文件数量 |
| 呼号 / 最近比赛 | `N1MM Logger.ini` 中 **仅限** `[EntryWindow] Operator`、`[Other] LastVersionExecuted`、`[Configurer] RecentContest 1`；最近比赛只保留比赛名与时间，丢弃其中的数据库完整路径 |
| TQSL | `%ProgramFiles(x86)%\TrustedQSL\tqsl.exe`、`%ProgramFiles%\TrustedQSL\tqsl.exe`、注册表卸载项、`%APPDATA%\TrustedQSL` 配置目录是否存在 |

**不会读取/返回**：`emailAddress`、密码、QSO 内容、ADIF/Cabrillo 内容、TQSL 私钥或证书内容。

**发送给 AI 的内容**：版本、**用 `~` 脱敏后的目录**、数据库数量与文件名、呼号、网格（手填）、常参加比赛（手填）、TQSL 状态与个性化建议。可以在页面“个性化信息”里关闭“允许 AI 使用本机检测信息”。

## 配置 DeepSeek

在 AI 助手设置中：

- **模型**：`deepseek-v4-pro`（旗舰，默认）、`deepseek-flash`（快速/经济）；也保留 `deepseek-chat` / `deepseek-reasoner` 旧别名与自定义输入。
- **接口模式**：`自动`（localhost 走本地代理 `/api/chat`，`file://` 直连）、`本地代理`、`直连`。
- **思考模式**：DeepSeek V4 支持 `thinking`，`reasoning_effort` 可选 `low/high/max`；思考内容折叠显示。思考模式下 `temperature` 等参数不生效。
- **知识库增强**：发送前在本页知识库中检索最相关资料，与问题一起发送。

API Key 默认保存在浏览器 `localStorage`，只发送给 DeepSeek 或本机代理。若不想让 Key 出现在浏览器端，可在启动前设置环境变量 `DEEPSEEK_API_KEY`（服务端会在客户端未提供 Authorization 时使用它）。

## 文件说明

| 文件 | 作用 |
|---|---|
| `index.html` | 教程主页（含自动检测/个性化面板与聊天窗口结构） |
| `styles.css` | 样式表 |
| `app.js` | 知识库、检索、检测结果渲染、DeepSeek 调用与聊天界面 |
| `server.mjs` | 本地静态服务器 + `/api/detect` 自动检测 + DeepSeek 流式代理 |
| `启动网站.bat` | Windows 一键启动 |
| `start.sh` | macOS / Linux 启动脚本 |
| `package.json` | 项目元数据（`npm start`） |
| `README.md` | 本说明 |
| `LICENSE` | MIT 许可证 |

## 常见问题

**Q：双击 bat 提示“未检测到 Node.js”？**
安装 Node.js LTS（<https://nodejs.org/>）后重试；或直接双击 `index.html` 使用离线知识库（无自动检测）。

**Q：端口 8765 被占用？**
`server.mjs` 会自动尝试 8766、8767……；也可用 `node server.mjs --port 9000`。

**Q：聊天报 “Failed to fetch”？**
多为 CORS/代理/网络问题。用 `启动网站.bat` 或 `start.sh` 以 `http://127.0.0.1` 打开，并在设置中选择“本地代理”或“自动”。

**Q：检测结果显示“未检测到 N1MM”，但电脑上明明装了？**
请确认安装的是 **N1MM Logger+**（主程序 `N1MMLogger.net.exe`），并尝试用管理员权限运行一次 `启动网站.bat`；也可以在页面手动填写呼号/网格，并按教程中的通用路径操作。

**Q：自动检测会不会把我的日志上传？**
不会。`/api/detect` 只读取文件名与少量配置字段，不读取 QSO 内容；网站在 UI 上只在本机显示这些结果。GitHub 仓库中不包含任何使用者的个人数据。

## 官方资料

- N1MM Logger+ 官方文档：<https://n1mmwp.hamdocs.com/>
- N1MM 官方 FAQ（含 LoTW 导出说明）：<https://n1mmwp.hamdocs.com/faq/>
- 多机与多操作员：<https://n1mmwp.hamdocs.com/manual-operating/multiple-computer-and-multiple-op-contesting/>
- ARRL LoTW Help：<https://lotw.arrl.org/lotw-help/>
- ARRL TQSL 下载：<https://www.arrl.org/tqsl-download>
- DeepSeek API 文档：<https://api-docs.deepseek.com/>

## 许可证

MIT License，详见 `LICENSE`。
