/* ============================================================
   N1MM Logger+ 中文实践指南 · 交互脚本
   - 内置知识库（离线检索兜底）
   - DeepSeek API 聊天（流式 / 思考模式 / 知识库增强）
   - 目录高亮、复制按钮、移动端导航
   - 本机环境自动检测与个性化
   ============================================================ */
'use strict';

const STORE_SETTINGS = 'n1mm-guide.settings.v1';
const STORE_HISTORY  = 'n1mm-guide.history.v1';

const DEFAULT_SYS_PROMPT = `你是 N1MM Logger+（N1MM+）与业余无线电通联/比赛日志、Cabrillo、ADIF、ARRL LoTW/TQSL 的中文专家助手。
你的回答对象是正在使用 Windows 版 N1MM Logger+ 的中文业余无线电操作者。用户本机的具体版本、安装目录、数据目录、呼号、网格、数据库与 TQSL 状态会通过“用户本机环境”系统消息提供，请优先使用这些信息进行个性化回答。
要求：
1. 只回答与 N1MM Logger+、通联日志、比赛设置、多机/多地点、Cabrillo、ADIF、LoTW/TQSL 相关的问题；无关问题礼貌拒答并引导回主题。
2. 尽量给出精确的菜单路径（如 File > Export > Export ADIF to file…）、窗口名、字段名、快捷键和可复制命令。
3. 涉及比赛规则、LoTW 政策、证书流程时，明确提醒以主办方/ARRL 最新官方说明为准，并附上官方链接。
4. 区分 N1MM Logger（经典版）与 N1MM Logger+；不要编造不存在的菜单项或参数；不确定时说明不确定并建议查官方文档。
5. 涉及“多地点/多机”时，强调：一个交给 TQSL 签名的文件只能对应同一呼号 + 同一 Station Location；需要按地点拆分 ADIF，再分别签名。
6. 用简体中文回答，结构清晰，多步骤用编号，命令用代码块；先给结论/步骤，再给细节，不要过长。`;

/* ---------------- 内置知识库 ---------------- */
const KB = [
{
  id:'first-setup', title:'初次安装与升级 N1MM Logger+',
  tags:['安装','升级','初次设置','Full Install','Latest Update','安装目录'],
  body:`官方推荐顺序：先安装 Full Install（完整版），再安装 Latest Update（最新更新）。更新程序只覆盖程序目录，不会删除用户数据目录里的数据库和配置。
程序目录通常是 C:\\Program Files (x86)\\N1MM Logger+\\（32 位安装）；主程序 N1MMLogger.net.exe。实际路径与版本以本页“本机环境”检测结果为准。
重要习惯：升级/换电脑前先关闭 N1MM，复制整个用户数据目录 Documents\\N1MM Logger+ 作为备份。
不要用第三方“绿色版/汉化补丁”覆盖官方程序目录；中文界面优先使用官方 Localization 机制。`,
  src:[{t:'N1MM 官方：安装与升级',u:'https://n1mmwp.hamdocs.com/getting-started/installing-and-upgrading-n1mm-logger/'},{t:'N1MM 官方：下载',u:'https://n1mmwp.hamdocs.com/downloads/n1mm-full-install/'}]
},
{
  id:'dirs', title:'程序目录与用户数据目录：备份只认后者',
  tags:['目录','用户数据','备份','Databases','ExportFiles','FunctionKeyMessages','CallHistoryFiles'],
  body:`程序目录（C:\\Program Files (x86)\\N1MM Logger+\\）放 EXE/DLL，升级会覆盖，不要把自己的日志放这里。
用户数据目录（通常位于 %USERPROFILE%\\Documents\\N1MM Logger+\\；Windows“文档”被 OneDrive 接管时可能在 OneDrive\\Documents\\ 下）是核心资产：
• Databases\\*.s3db —— 数据库；一个 .s3db 里可以放很多份 Log。
• ExportFiles\\ —— ADIF、Cabrillo（.LOG）、通用导出的默认输出目录。
• FunctionKeyMessages\\ —— F1–F12 的 CW/SSB/数字消息文件。
• CallHistoryFiles\\ —— 比赛 Call History 文件。
• SkinsAndLayouts\\、SupportFiles\\、SystemFiles\\、UserDefinedContests\\、Wav\\ 等。
备份方法：关闭 N1MM，复制整个 Documents\\N1MM Logger+ 目录。`,
  src:[{t:'N1MM 官方：The Configurer（用户文件说明）',u:'https://n1mmwp.hamdocs.com/setup/the-configurer/'}]
},
{
  id:'database', title:'新建数据库与“数据库 vs 日志”',
  tags:['数据库','s3db','New Database','New Log in Database','系统数据库','Admin','DXLog','Packet Spots'],
  body:`N1MM+ 是“数据库 → 日志”两层结构：一个 .s3db 数据库像一个文件柜，里面可以放很多份 Log（比赛/日常日志）。
新建：File > New Database…，程序会打开用户数据目录下的 Databases\\，给数据库起英文/数字名（如 MyCall-DX.s3db）。
然后：File > New Log in Database: 你的数据库名，进入 Contest Setup 对话框建立该数据库下的第一份日志。
N1MM Admin.s3db、N1MM DXLog.s3db、N1MM Packet Spots.s3db 是 N1MM 自带的系统数据库，不是你的通联日志；个人数据库是除此之外的 .s3db 文件。
建议：一个个人数据库，内部按比赛/用途建多份 Log；不要为每个 QSO 建数据库，也不要把两场比赛混在同一份 Log 里。`,
  src:[{t:'N1MM 官方：Contest Setup',u:'https://n1mmwp.hamdocs.com/setup/contest-setup/'}]
},
{
  id:'contest-setup', title:'Contest Setup：新建比赛日志的核心字段',
  tags:['Contest Setup','Log Type','比赛设置','New Log','日期','波段','Show Setup','Show Rules'],
  body:`入口：File > New Log in Database: 数据库名，打开 Contest Setup 对话框。
1) Log Type：按比赛缩写选择；选对比赛才能正确计分、判重复台、生成交换信息与 Cabrillo。可先看 Show Rules（主办方规则）与 Show Setup（N1MM 官方设置页）。
2) 起止日期/时间：比赛按规则填写；N1MM 内部用 UTC。
3) Category：操作员/波段/功率/模式/Overlay/Station/发射机/时间/Assisted 等。
4) Sent Exchange：只填你固定发给对方的内容（州/省、分区、序列号起始值等），不要写 59/599。
5) Operators：操作员呼号；可选绑定 Call History、功能键消息、Section List 等 Associated Files。
比赛开始后不要改 Log Type；选错建议新建正确日志并重新导入/录入。`,
  src:[{t:'N1MM 官方：Contest Setup',u:'https://n1mmwp.hamdocs.com/setup/contest-setup/'}]
},
{
  id:'category', title:'比赛类别 Category：操作员/波段/功率/模式/Assisted',
  tags:['Category','类别','Single-Op','Multi-Op','Assisted','QRP','Low Power','High Power','Overlay','Station','SO2R'],
  body:`常见类别组：
• Operator：Single-Op、Single-Op Assisted、Multi-Op、Multi-Single、Multi-Multi、SWL 等；决定是否可用 Spot/Cluster。
• Band：All Band 或 Single Band（160/80/40/20/15/10/6m…）。
• Power：QRP / Low Power / High Power（具体阈值按主办方规则）。
• Mode：CW / SSB / Mixed / Digital / RTTY。
• Overlay：TB-Wires、Classic、Rookie、Youth 等（仅比赛支持时出现）。
• Station：Fixed / Portable / Mobile / Rover / Maritime 等。
• Transmitter / Xmitter：One / Two / Multi…（SO2R 如实选择）。
• Time：24-hour / 6-hour / 12-hour 等。
• Assisted：使用 DX Cluster/Spot 通常要选 Assisted（除非该比赛另有规定）。
Category 会写进 Cabrillo 头部，比赛前务必核对。`,
  src:[{t:'N1MM 官方：Contest Setup',u:'https://n1mmwp.hamdocs.com/setup/contest-setup/'}]
},
{
  id:'sent-exchange', title:'Sent Exchange 与序列号：不要写 599',
  tags:['Sent Exchange','交换信息','序列号','Serial','EXCH','599','5NN','CQ Zone','Section','Field Day'],
  body:`Sent Exchange 只放“你固定发给对方的交换内容”，例如 CQ Zone（05）、州/省（CT/MA）、序列号起始值（1）、Field Day 的 Class+Section。
官方特别提醒：如果交换是 5NN WV，只把 WV 放进 Sent Exchange，5NN 交给 F 键消息（如 {SENTRST} {EXCH}）。把 5NN 写进 Sent Exchange 会让每条 Cabrillo QSO 多一个信号报告，导致日志被退回。
序列号比赛可在对话框中设置起始序列号；多机比赛可用“序列号服务器”，保证同波段/模式序列号不重复。
工具：Associated Files 可绑定 Call History、Section List，帮助自动带出/校验交换信息。`,
  src:[{t:'N1MM 官方：HF SSB/CW 比赛设置',u:'https://n1mmwp.hamdocs.com/manual-supported/contests-setup/setup-hf-contests/'}]
},
{
  id:'station-data', title:'Station Data：呼号、网格、分区必须与 TQSL 一致',
  tags:['Station Data','Change Your Station Data','呼号','网格','Grid Square','CQ Zone','ITU Zone','州','DXCC','LoTW'],
  body:`路径：Config > Change Your Station Data。这是所有日志共用的“我是谁、我在哪”。
关键字段：Call（含 /P 等）、Grid Square（4 或 6 位梅登海德网格）、State/Province、CQ Zone、ITU Zone、DXCC Entity/Continent。
为什么要准：它影响交换信息猜测、Cabrillo 头部，以及 LoTW 的台站位置。换物理地点（哪怕呼号不变）都要更新这里的网格/州/分区；TQSL 里也要为这个地点建对应 Station Location。
多地点操作的核心：Station Data（N1MM）+ Station Location（TQSL）指向同一个真实位置，网格/分区/州/DXCC 要对得上。`,
  src:[{t:'N1MM 官方：Operating a Contest',u:'https://n1mmwp.hamdocs.com/getting-started/operating-a-contest/'},{t:'ARRL LoTW：Station Location',u:'https://lotw.arrl.org/lotw-help/stnloc/'}]
},
{
  id:'configurer', title:'Configurer：电台、端口、音频、CW、数字与 Telnet',
  tags:['Configurer','Configure Ports','Mode Control','Audio','Other','电台','COM','音频','CW','PTT','WSJT-X','JTDX','JTAlert','Telnet','UDP','2333','52001'],
  body:`入口：Config > Configure Ports, Mode Control, Audio, Other…（The Configurer）。
• Hardware：Radio 1/2 型号与 COM 口、波特率；CW/PTT/FSK 端口；SO2R、旋转器、天线切换。未接设备端口保持 None。
• Audio：声卡输入/输出、录音、数字模式音频路由、SSB 语音键控。
• Other：Telnet 集群、Call History、分数显示、界面语言、UDP 广播、外部程序接口。
• WSJT/JTDX：启用对应端口；WSJT-X/JTAlert 默认 UDP 2333，JTDX 默认 TCP 52001，勾选 Enable 后可能需要重启 N1MM。
建议先只配 Radio 1，能读频率/切波段即可；再配 CW/PTT 与音频。CW 键控优先 Winkeyer 类硬件。`,
  src:[{t:'N1MM 官方：The Configurer',u:'https://n1mmwp.hamdocs.com/setup/the-configurer/'},{t:'N1MM 官方：发送日志数据到 N1MM',u:'https://n1mmwp.hamdocs.com/sending-log-data-to-n1mm/'}]
},
{
  id:'entry-window', title:'Entry Window 录入 QSO 与常用快捷键',
  tags:['Entry Window','录入','记录','QSO','Enter','Space','ESM','Ctrl+O','OPON','F1','F12','宏'],
  body:`录入流程：输入 Call → 填 RST/交换信息 → 按 Enter/空格记入日志。
• Enter：记录并清空；Space：ESM（Enter Sends Message）模式下发送对应消息。
• Ctrl+O 或输入 OPON：切换操作员。
• F1–F12：功能键消息，CW/SSB/数字模式各有文件；比赛中交换信息通常写在 F2/F3 等键。
• 宏：{EXCH}、{CALL}、{SENTRST} 等自动带入当前 QSO 内容，避免手输。
• Dupe/Check：输入呼号时自动检查重复台与呼号历史；颜色与 Check 窗口提示。
• 比赛利器：Bandmap、Telnet、Available Mults & Qs、Multipliers、Statistics。`,
  src:[{t:'N1MM 官方：Entry Window',u:'https://n1mmwp.hamdocs.com/manual-windows/entry-window/'}]
},
{
  id:'adif-export', title:'从 N1MM 导出 ADIF（给 LoTW 用）',
  tags:['ADIF','导出','Export','Export ADIF to file','LoTW','.adi','ExportFiles','选中QSO','Multi-User Station Name'],
  body:`路径：File > Export > Export ADIF to file…（N1MM 官方 FAQ 对 LoTW 的标准答案）。
默认输出到 Documents\\N1MM Logger+\\ExportFiles\\，文件名如 arrl-dx-cw-2026.adi。
只导出部分 QSO：先在 Log Window 选中需要的 QSO，再执行导出。
多用户/多机环境：官方提供 Export ADIF to file by Multi-User Station Name，可按 Network Status 中的 Station Name 导出该台站的全部 QSO，便于按地点/台站分别签名 LoTW。
LoTW 至少需要：对方呼号、UTC 日期时间、波段、模式。导出后用记事本核对 <CALL>、<QSO_DATE>、<TIME_ON>、<BAND>、<MODE>。
注意：删除的 QSO 默认不导出；要导出删除记录可选择 DELETEDQS 日志类型。`,
  src:[{t:'N1MM 官方 FAQ（LoTW 导出）',u:'https://n1mmwp.hamdocs.com/faq/'},{t:'N1MM 官方：Entry Window（导出说明）',u:'https://n1mmwp.hamdocs.com/manual-windows/entry-window/'}]
},
{
  id:'cabrillo', title:'生成 Cabrillo 并检查头部（比赛提交）',
  tags:['Cabrillo','.LOG','Generate Cabrillo File','Rescore','比赛提交','LOCATION','CATEGORY','CLAIMED-SCORE','OPERATORS'],
  body:`赛后路径：
1) 备份数据库；
2) Tools > Rescore Current Contest 重新计分；
3) File > Generate Cabrillo File，生成“你的呼号.LOG”，默认在 ExportFiles；
4) 用记事本检查头部：CALLSIGN、CONTEST、CATEGORY-*、CLAIMED-SCORE、OPERATORS、NAME、ADDRESS；某些比赛要求手动编辑 LOCATION 行标明位置；
5) 按主办方要求上传/邮件提交。
常见退回原因：Sent Exchange 多写 5NN/59；Log Type 选错；Category 与实际不符；时间不是 UTC；起止日期错误。
记住：比赛提交用 Cabrillo，LoTW 用 ADIF。`,
  src:[{t:'N1MM 官方：Operating a Contest',u:'https://n1mmwp.hamdocs.com/getting-started/operating-a-contest/'}]
},
{
  id:'multi-location', title:'不同地点使用同一套日志（同机、不同时间）',
  tags:['多地点','不同地点','便携','/P','网格','Station Data','Station Location','拆分ADIF','LoTW','同一个日志'],
  body:`可以统一管理，但导出给 TQSL 时必须按地点拆分。
推荐流程：
1) 换地点前：Config > Change Your Station Data，改成该地点的呼号（含 /P）、网格、州/省、CQ/ITU 分区、DXCC。
2) 每个地点/每次活动新建一份 Log（File > New Log in Database），例如 ARRL-DX-CW-Home、ARRL-DX-CW-Portable。
3) 赛后分别 File > Export > Export ADIF to file… 得到 home.adi、portable.adi。
4) TQSL 中为每个地点各建一个 Station Location（CALL-Home、CALL-Portable）。
5) 分别签名上传：tqsl -d -u -a compliant -l "CALL-Home" "home.adi"。
硬性规则：一个交给 TQSL 签名的文件里，所有 QSO 必须属于同一个台站呼号 + 同一个操作地点。
比赛规则优先：软件能合并/分别上传，不代表比赛允许跨地点合并成绩；以该比赛官方规则为准。`,
  src:[{t:'ARRL LoTW：Multiple Callsigns and Operating Locations',u:'https://lotw.arrl.org/lotw-help/multiple-callsigns-locations/'},{t:'ARRL LoTW：Submitting QSOs',u:'https://lotw.arrl.org/lotw-help/submitting-qsos/'}]
},
{
  id:'multi-network', title:'多台电脑同时操作：N1MM 网络模式',
  tags:['多机','网络','Network','Network Status','Station Name','Multi-Op','局域网','LAN','自动发现','VPN','分布式'],
  body:`要点：N1MM 多机不是共享同一个 .s3db 文件，而是用它自己的 Network 协议。
1) 所有电脑安装相同版本 N1MM+，打开相同比赛类型（Log Type）的日志；类别也要一致，否则会警告。
2) 接到同一局域网；Config > Network（或 Configurer 的 Network 标签）启用联网；程序会自动发现同一子网内运行相同版本的电脑，通常无需手填 IP。
3) 在 Network Status Window 给每台机设置唯一的 Station Name（如 RUN1、MULT、INBAND）；该名字随 QSO 保存。
4) 用一份共享的比赛日志（推荐一台作为主库）；不要两台机各自建同名日志后指望自动合并。
5) 跨网段/互联网：可用固定 IP/端口或 VPN（官方文档提到 SoftEther、Hamachi 等方案），注意防火墙放行。
6) 测试：一台机记测试 QSO，另一台应立即在 Log/Network 看到；Ctrl+E 可打开网络聊天。`,
  src:[{t:'N1MM 官方：Multi-Computer and Multi-Op',u:'https://n1mmwp.hamdocs.com/manual-operating/multiple-computer-and-multiple-op-contesting/'},{t:'N1MM 官方：Network Status Window',u:'https://n1mmwp.hamdocs.com/manual-windows/network-status-window/'}]
},
{
  id:'merge-logs', title:'合并比赛日志（ADIF 方式）',
  tags:['合并','Merge','ADIF','Import','CONTEST_ID','多机','日志合并','导入'],
  body:`官方推荐用 ADIF 合并：
1) 在每台记录电脑上 File > Export > Export ADIF to file，给每个文件起唯一名字；
2) 用记事本检查每个 ADIF 的 <CONTEST_ID:...> 是否完全一致（长度和内容都要一致，例如 <CONTEST_ID:14>ARRL-FIELD-DAY）；
3) 把所有 ADIF 汇总/导入到同一份新日志：File > Import（选择 ADIF 文件）；
4) 合并后重新计分、检查重复台与时间顺序，再生成 Cabrillo。
如果各电脑的比赛类型不一致，合并会很困难甚至不可行；比赛期间就用相同 Log Type 才是上策。
不要用 Excel 手工合并 Cabrillo，除非你完全清楚 Cabrillo 格式与主办方要求。`,
  src:[{t:'N1MM 官方：Operating a Contest（合并日志）',u:'https://n1mmwp.hamdocs.com/getting-started/operating-a-contest/'}]
},
{
  id:'lotw-concept', title:'LoTW 四个核心概念：账户 / 呼号证书 / Station Location / TQSL',
  tags:['LoTW','TQSL','呼号证书','Callsign Certificate','Station Location','TQ8','数字签名','ARRL'],
  body:`LoTW（Logbook of The World）是 ARRL 的 QSO 确认服务；确认可用于 DXCC/WAS/VUCC/WAZ/WPX 等奖励学分。
• LoTW Account：ARRL 在线账户，用用户名/密码登录查看已提交/已确认 QSO。
• Callsign Certificate：绑定呼号的数字证书（含私钥），有效期 3 年，可续期；每个呼号一张。
• Station Location：在 TQSL 中定义的台站位置（呼号+网格+ITU/CQ 分区+IOTA+DXCC+州/县等），每个物理地点一个。
• TQSL：ARRL 免费签名/上传工具；读取 ADIF 或 Cabrillo，用呼号证书签名，生成加密 .tq8 并上传 LoTW。
N1MM 本身不做数字签名：标准流程是 N1MM 导出 ADIF → TQSL 签名上传。`,
  src:[{t:'ARRL LoTW Help',u:'https://lotw.arrl.org/lotw-help/'},{t:'ARRL LoTW：Key Concepts',u:'https://lotw.arrl.org/lotw-help/key-concepts/'}]
},
{
  id:'lotw-cert', title:'申请/接受/续期呼号证书',
  tags:['呼号证书','Callsign Certificate','申请','接受','续期','Renew','Master','主控电脑','Required Documentation'],
  body:`步骤：
1) 从 ARRL 官方下载并安装 TQSL。
2) TQSL → Callsign Certificate → Request New Callsign Certificate，输入呼号、DXCC 实体、姓名/地址/邮箱等，按向导提交。
3) 美国呼号通常按 FCC 数据库核对；非美国呼号可能需要提交操作执照等证明文件（Required Documentation）。
4) ARRL 处理后会通过邮件发送 LoTW 账户密码与证书；必须在“申请证书的那台电脑”上接受证书（官方建议指定一台 Master/主控电脑）。
5) 用邮件中的用户名/密码登录 LoTW 验证账户。
6) 证书有效期 3 年，到期前会收到提醒；在 TQSL 中 Renew。主控电脑更新后，用 TQSL Backup/Restore 同步到其他电脑。`,
  src:[{t:'ARRL LoTW：Getting Started',u:'https://lotw.arrl.org/lotw-help/getting-started/'}]
},
{
  id:'lotw-stnloc', title:'创建 Station Location（每个地点一个）',
  tags:['Station Location','台站位置','网格','Grid Square','CQ Zone','ITU Zone','IOTA','County','州','DXCC','TQSL'],
  body:`TQSL → Station Locations 标签 → Create a new Station Location。
填写：呼号（或 [None] + DXCC 实体）、Grid Square（4 位或 6 位；官方也支持逗号分隔的多个网格）、ITU Zone、CQ Zone、IOTA 参考号（如适用）、州/县等奖励信息。
命名建议：呼号+地点，例如 MYCALL-Home、MYCALL-Portable-GRID。
关键：Station Location 的地点是“物理位置”。同一呼号在不同地点操作，要建多个 Station Location；与 N1MM 的 Station Data（网格/分区/州/DXCC）保持一致。
位置信息会影响对方能否获得 VUCC/WAS 等奖励学分，必须准确完整。`,
  src:[{t:'ARRL LoTW：Defining a Station Location',u:'https://lotw.arrl.org/lotw-help/stnloc/'}]
},
{
  id:'lotw-sign', title:'TQSL 签名并上传（GUI 与命令行）',
  tags:['TQSL','签名','上传','Sign','Upload','tq8','命令行','cmdline','-l','-u','-a','-x','LoTW'],
  body:`图形界面：TQSL → Sign a log and upload it automatically to LoTW → 选择 ADIF/Cabrillo → 选择与该批 QSO 完全一致的 Station Location → 签名并上传；成功会显示 “Log uploaded successfully ... File queued for processing”。也可先保存 .tq8 离线签名。
命令行（官方示例）：
tqsl -d -u -a new -x -l "CQWW Portable" "cqww log.adi" 2>results.txt
常见含义：-l 指定 Station Location；-u 签名并上传；-a 选择对重复/超范围 QSO 的处理策略；-x 完成后退出；-d 输出调试信息。参数以 tqsl --help 与官方 CLI 页面为准。
本页给出的常用写法：
tqsl -d -u -a compliant -l "MYCALL-Home" "n1mm-export.adi"
注意：一个文件只能用一个呼号+一个 Station Location；多地/多呼号必须拆成多个文件分别签。`,
  src:[{t:'ARRL LoTW：TQSL CLI',u:'https://lotw.arrl.org/lotw-help/cmdline/'},{t:'ARRL LoTW：Submitting QSOs',u:'https://lotw.arrl.org/lotw-help/submitting-qsos/'}]
},
{
  id:'lotw-multi', title:'多地点/多呼号 LoTW 签名策略与换电脑',
  tags:['多地点','多呼号','拆分ADIF','TQSL','备份','Restore','新电脑','Multiple Computers','私人密钥'],
  body:`硬性规则（ARRL 官方）：提交给 LoTW 的一个文件中的所有 QSO，必须使用同一个台站呼号、同一个操作地点，才能用同一个 Callsign Certificate 和 Station Location 签名。混了就拆分。
对照表：
• 同呼号同地点：1 张证书 + 1 个 Station Location，直接签。
• 同呼号多地点：1 张证书 + 每个地点 1 个 Station Location，按地点拆 ADIF 分别签。
• 不同呼号：每个呼号 1 张证书，按“呼号+地点”拆开分别签。
• DX 远征/移动：按呼号+地点+日期拆分，逐段签。
多电脑：官方建议指定一台 Master/主控电脑负责申请/续期证书与维护 Station Location；用 TQSL 的 Backup File 备份呼号证书、私钥、Station Location 和偏好设置，复制到新电脑后 Restore。私有密钥不要用邮件明文发送。`,
  src:[{t:'ARRL LoTW：Multiple Callsigns and Operating Locations',u:'https://lotw.arrl.org/lotw-help/multiple-callsigns-locations/'},{t:'ARRL LoTW：Multiple Computers',u:'https://lotw.arrl.org/lotw-help/multiple-computers/'}]
},
{
  id:'troubleshooting', title:'常见故障排查：LoTW 未确认、Cabrillo 退回、数据库打不开',
  tags:['排错','未确认','Duplicate','重复','Cabrillo退回','数据库打不开','ErrorLog','bkup','LoTW','确认'],
  body:`LoTW 上传成功但对方没确认：LoTW 确认是双向的，对方也要上传匹配 QSO。检查呼号、UTC 日期/时间、波段、模式、卫星名是否一致，以及 Station Location 是否正确。
重复/超范围提示：TQSL 会提示 duplicates 或 out of date range，这是保护机制；改过的 QSO 要按 LoTW 更正流程处理。
Cabrillo 被退回：检查 Sent Exchange 是否多写 5NN、Log Type 是否选错、Category 是否与实际不符、时间是否 UTC、LOCATION 行是否正确；改完 Rescore 后重新 Generate。
数据库打不开：先关闭 N1MM 并备份整个 Databases 目录；确认没选错 .s3db.bkup；可尝试用同名 .bkup 备份恢复（先复制再改名）；查看用户目录 LogError.txt 与 Diagnostics 文件夹；必要时在 N1MM 官方支持站提交工单。
最有效的预防：关闭程序后定期复制整个 Documents\\N1MM Logger+。`,
  src:[{t:'N1MM 官方 FAQ',u:'https://n1mmwp.hamdocs.com/faq/'},{t:'ARRL LoTW：Troubleshooting',u:'https://lotw.arrl.org/lotw-help/troubleshooting/'}]
},
{
  id:'backup', title:'备份、换电脑、重装系统的完整清单',
  tags:['备份','换电脑','重装','Backup','Restore','TQSL','数据库','用户数据目录'],
  body:`N1MM 侧：
1) 关闭 N1MM；
2) 复制整个 C:\\Users\\你的用户名\\Documents\\N1MM Logger+\\（含 Databases、ExportFiles、FunctionKeys、CallHistory 等）；
3) 新电脑安装同版本 N1MM+，把该目录放回 Documents（先备份新机原目录）；
4) 启动 N1MM，File > Open Database 检查数据库与 Log。
TQSL 侧：
1) 在旧电脑 TQSL 中创建 Backup File（包含呼号证书、私钥、Station Location、偏好设置）；
2) 把备份文件复制到新电脑；
3) 在新电脑 TQSL 中 Restore；
4) 以后在主控电脑新增/续期证书或修改 Station Location 后，重复 Backup/Restore 同步。
安全：私钥备份文件要加密保存，不要公开分享或明文邮件发送。`,
  src:[{t:'ARRL LoTW：Multiple Computers',u:'https://lotw.arrl.org/lotw-help/multiple-computers/'}]
},
{
  id:'deepseek-help', title:'本页 AI 助手：模型、参数与 Key 安全',
  tags:['DeepSeek','AI','助手','API Key','模型','deepseek-v4-pro','deepseek-flash','思考模式','CORS','代理'],
  body:`本页聊天窗口调用 DeepSeek API（OpenAI 兼容格式）：POST https://api.deepseek.com/chat/completions。
模型：deepseek-v4-pro（旗舰，复杂推理）、deepseek-flash（快速经济，1M 上下文）；旧别名 deepseek-chat / deepseek-reasoner 是否可用以官方为准。
思考模式：请求体 thinking:{type:"enabled"}，reasoning_effort 可选 low/high/max；思考内容在 reasoning_content，本页折叠显示。思考模式下 temperature 等参数不生效。
Key 安全：默认只保存在浏览器 localStorage，只发送给 DeepSeek 或本地代理；网页不会读取/上传你的 .s3db 或 ADIF。公用电脑上用完请清除 Key。
CORS：已实测 DeepSeek 允许浏览器端 POST + authorization/content-type 头（包括 Origin: null）。若直连失败，用 server.mjs 启动本地代理，在设置中选“本地代理”。
费用：按 DeepSeek 官方定价页计费，请自行关注余额与价格变化。`,
  src:[{t:'DeepSeek API Docs',u:'https://api-docs.deepseek.com/'},{t:'DeepSeek：Thinking Mode',u:'https://api-docs.deepseek.com/guides/thinking_mode'}]
},
{
  id:'auto-detect', title:'本机自动检测与个性化（/api/detect）',
  tags:['自动检测','个性化','api/detect','安装目录','数据目录','TQSL','呼号','Node.js','本地服务器'],
  body:`通过 启动网站.bat / start.sh 以 http://127.0.0.1 打开时，页面会请求本地服务器的 GET /api/detect 自动读取：
• N1MM Logger+ 是否安装、版本号、程序目录（注册表卸载项 + 常见 Program Files 路径）。
• 用户数据目录（注册表“文档”位置、Documents、OneDrive Documents、APPDATA/LOCALAPPDATA、安装目录等候选）。
• Databases 下的 .s3db 列表与系统库/个人库区分、ExportFiles 文件数。
• N1MM Logger.ini 中允许的少量字段：EntryWindow.Operator、LastVersionExecuted、RecentContest（只保留比赛名与时间，丢弃数据库完整路径）。
• TQSL 是否安装、版本、配置目录是否存在。
检测结果只在本机页面显示；发送给 AI 的目录会用 ~ 代替用户名。直接以 file:// 打开时浏览器禁止读取本机路径，此时可在“个性化信息”里手动填写呼号/网格，或改用本地服务器方式。
隐私：接口不返回 emailAddress、密码、QSO 内容、TQSL 私钥/证书内容；API 仅监听 127.0.0.1，并校验 Host/Origin，非本机来源返回 403。`,
  src:[{t:'N1MM 官方：The Configurer',u:'https://n1mmwp.hamdocs.com/setup/the-configurer/'},{t:'ARRL LoTW Help',u:'https://lotw.arrl.org/lotw-help/'}]
}
];

/* ---------------- 预设问题 ---------------- */
const PRESETS = [
  {label:'初次建库建日志', q:'我第一次使用 N1MM Logger+，请按顺序告诉我怎样新建数据库、建立第一份日志、配置台站数据，以及每一步要填什么。'},
  {label:'ARRL DX CW 设置', q:'我要参加 ARRL DX CW，请说明在 N1MM Logger+ 的 Contest Setup 里 Log Type、Category、Sent Exchange 分别怎么填；如果我是中国台，交换信息应该是什么？'},
  {label:'多地点同一日志', q:'我平时在家操作，周末会去另一个网格地点用同一个呼号操作。怎样用同一套 N1MM 日志记录，最后又正确地分别上传 LoTW？请给出完整步骤。'},
  {label:'两台电脑联网', q:'两台电脑同时在同一个比赛里操作，怎样用 N1MM Logger+ 的 Network 联网？Station Name、数据库、比赛类型要怎么设置？赛后如何按台站导出 ADIF？'},
  {label:'ADIF 到 TQSL 上传', q:'请给出从 N1MM Logger+ 导出 ADIF、用 TQSL 签名并上传到 ARRL LoTW 的完整步骤，包括图形界面和命令行两种方式。'},
  {label:'Cabrillo 检查清单', q:'比赛结束后生成 Cabrillo 之前和之后，我需要检查哪些设置与头部字段？常见被退回的原因有哪些？'},
  {label:'LoTW 没确认', q:'我把日志上传到 LoTW 了，但对方一直没有确认。请按可能性从高到低列出排查步骤。'},
  {label:'备份与换电脑', q:'我要重装系统/换电脑，怎样完整迁移 N1MM Logger+ 的数据库、设置，以及 TQSL 的呼号证书和 Station Location？'}
];

/* ---------------- 工具函数 ---------------- */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
function escapeHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s){ return escapeHtml(s).replace(/`/g,'&#96;'); }
function toast(msg, ms){
  const el = $('#toast'); if(!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(()=>el.classList.remove('show'), ms || 2200);
}
function copyText(text){
  if(navigator.clipboard && window.isSecureContext){
    return navigator.clipboard.writeText(text);
  }
  return new Promise((res, rej)=>{
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); res(); }catch(e){ rej(e); }
    finally{ ta.remove(); }
  });
}
function download(filename, text){
  const blob = new Blob([text], {type:'text/markdown;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 300);
}

/* ---------------- 极简 Markdown 渲染 ---------------- */
function inlineMd(s){
  let t = escapeHtml(s);
  t = t.replace(/`([^`]+)`/g, (m,a)=>`<code>${a}</code>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  t = t.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  return t;
}
function md(src){
  const lines = String(src == null ? '' : src).replace(/\r\n?/g,'\n').split('\n');
  let out = [], i = 0, para = [];
  function flush(){
    if(para.length){ out.push('<p>' + inlineMd(para.join(' ')) + '</p>'); para = []; }
  }
  while(i < lines.length){
    const line = lines[i];
    if(/^```/.test(line)){
      flush();
      const lang = line.slice(3).trim();
      const buf = []; i++;
      while(i < lines.length && !/^```/.test(lines[i])){ buf.push(lines[i]); i++; }
      i++;
      out.push('<pre><code' + (lang ? ' data-lang="' + escapeAttr(lang) + '"' : '') + '>' + escapeHtml(buf.join('\n')) + '</code></pre>');
      continue;
    }
    if(/^\s*\|.*\|\s*$/.test(line) && i+1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i+1])){
      flush();
      const rows = [];
      while(i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])){ rows.push(lines[i]); i++; }
      const cells = r => r.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
      let html = '<div class="tablewrap"><table><thead><tr>' + cells(rows[0]).map(c=>'<th>'+inlineMd(c)+'</th>').join('') + '</tr></thead><tbody>';
      for(let r=2;r<rows.length;r++) html += '<tr>' + cells(rows[r]).map(c=>'<td>'+inlineMd(c)+'</td>').join('') + '</tr>';
      html += '</tbody></table></div>'; out.push(html); continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if(h){ flush(); const lv = Math.min(h[1].length + 2, 6); out.push('<h'+lv+'>'+inlineMd(h[2])+'</h'+lv+'>'); i++; continue; }
    if(/^\s*([-*_])\s*\1\s*\1+\s*$/.test(line)){ flush(); out.push('<hr>'); i++; continue; }
    if(/^\s*>\s?/.test(line)){ flush(); const buf=[]; while(i<lines.length && /^\s*>\s?/.test(lines[i])){ buf.push(lines[i].replace(/^\s*>\s?/,'')); i++; } out.push('<blockquote>'+inlineMd(buf.join(' '))+'</blockquote>'); continue; }
    if(/^\s*[-*+]\s+/.test(line)){
      flush(); const items=[];
      while(i<lines.length && /^\s*[-*+]\s+/.test(lines[i])){ items.push(lines[i].replace(/^\s*[-*+]\s+/,'')); i++; }
      out.push('<ul>'+items.map(x=>'<li>'+inlineMd(x)+'</li>').join('')+'</ul>'); continue;
    }
    if(/^\s*\d+[.)]\s+/.test(line)){
      flush(); const items=[];
      while(i<lines.length && /^\s*\d+[.)]\s+/.test(lines[i])){ items.push(lines[i].replace(/^\s*\d+[.)]\s+/,'')); i++; }
      out.push('<ol>'+items.map(x=>'<li>'+inlineMd(x)+'</li>').join('')+'</ol>'); continue;
    }
    if(line.trim()===''){ flush(); i++; continue; }
    para.push(line.trim()); i++;
  }
  flush();
  return out.join('\n');
}

/* ---------------- 知识库检索 ---------------- */
function tokenize(q){
  const s = String(q || '').toLowerCase();
  const en = s.match(/[a-z0-9][a-z0-9_.\-\/+]{1,}/g) || [];
  const zhRuns = s.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const grams = [];
  zhRuns.forEach(w=>{ for(let i=0;i<w.length-1;i++) grams.push(w.slice(i,i+2)); });
  return Array.from(new Set([].concat(en, zhRuns, grams))).filter(x=>x && x.length>1);
}
function searchKB(q, limit){
  const terms = tokenize(q);
  const scored = KB.map(e=>{
    const title = e.title.toLowerCase(), tagStr = e.tags.join(' ').toLowerCase(), body = e.body.toLowerCase();
    const hay = title + ' ' + tagStr + ' ' + body;
    let score = 0;
    terms.forEach(t=>{
      const n = hay.split(t).length - 1;
      if(n > 0){
        score += n + (title.indexOf(t) >= 0 ? 6 : 0) + (tagStr.indexOf(t) >= 0 ? 3 : 0);
        score += t.length > 3 ? 2 : 0;
      }
    });
    return {e, score};
  }).filter(x=>x.score > 0).sort((a,b)=>b.score-a.score);
  if(!scored.length) return KB.slice(0, 3);
  return scored.slice(0, limit || 4).map(x=>x.e);
}
function buildKBContext(q){
  const hits = searchKB(q, 4);
  if(!hits.length) return {text:'', hits:[]};
  const text = '以下是与用户问题可能相关的本站知识库资料（整理自 N1MM 与 ARRL 官方文档）。回答时优先依据这些资料；涉及规则、政策、证书流程时给出官方链接。\n\n' +
    hits.map((e,i)=>'【资料'+(i+1)+'】'+e.title+'\n'+e.body + '\n来源：' + e.src.map(s=>s.t+' '+s.u).join('；')).join('\n\n');
  return {text, hits};
}

/* ---------------- 设置 ---------------- */
const DEFAULT_SETTINGS = {
  apiKey:'', model:'deepseek-v4-pro', customModel:'', apiMode:'auto',
  baseUrl:'https://api.deepseek.com', stream:true, thinking:true,
  effort:'high', temperature:0.3, kb:true, sysPrompt:DEFAULT_SYS_PROMPT
};
let settings = Object.assign({}, DEFAULT_SETTINGS);
try{
  const saved = JSON.parse(localStorage.getItem(STORE_SETTINGS) || '{}');
  settings = Object.assign(settings, saved || {});
}catch(e){ /* ignore */ }
if(!settings.sysPrompt) settings.sysPrompt = DEFAULT_SYS_PROMPT;

function saveSettings(){
  try{ localStorage.setItem(STORE_SETTINGS, JSON.stringify(settings)); }catch(e){ toast('保存失败：浏览器存储不可用'); }
}
function modelName(){
  const m = settings.model === '__custom' ? (settings.customModel || '').trim() : settings.model;
  return m || 'deepseek-v4-pro';
}
function isV4Model(m){ return /^deepseek-(v4|flash)/i.test(m || ''); }
function isLocalHost(){
  const h = location.hostname;
  return location.protocol.startsWith('http') && (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '');
}
function endpointInfo(){
  const mode = settings.apiMode || 'auto';
  const useProxy = mode === 'proxy' || (mode === 'auto' && isLocalHost());
  if(useProxy) return {url:'/api/chat', proxy:true};
  const base = (settings.baseUrl || 'https://api.deepseek.com').replace(/\/+$/,'');
  return {url:base + '/chat/completions', proxy:false};
}

/* ---------------- 构建请求 ---------------- */
function buildMessages(kbText){
  const msgs = [{role:'system', content: settings.sysPrompt || DEFAULT_SYS_PROMPT}];
  const envText = envForAI();
  if(envText) msgs.push({role:'system', content: envText});
  if(kbText) msgs.push({role:'system', content: kbText});
  const near = history.filter(m => m.role === 'user' || m.role === 'assistant').slice(-12);
  near.forEach(m => msgs.push({role:m.role, content:m.content}));
  return msgs;
}
function buildBody(messages, opts){
  const model = modelName();
  const body = {model, messages, stream: !!(opts && opts.forceNonStream ? false : settings.stream)};
  if(isV4Model(model)){
    body.thinking = {type: settings.thinking ? 'enabled' : 'disabled'};
    if(settings.thinking){ body.reasoning_effort = settings.effort || 'high'; body.max_tokens = 8192; }
    else { body.temperature = Number(settings.temperature); body.max_tokens = 4096; }
  }else{
    body.temperature = Number(settings.temperature);
    body.max_tokens = 4096;
  }
  return body;
}
function friendlyError(err){
  const raw = String((err && err.message) || err || '未知错误');
  let hint = '';
  if(/未配置 API Key/.test(raw)) hint = '。请点右上角 ⚙ 设置，填入 DeepSeek API Key。';
  else if(/Failed to fetch|NetworkError|Load failed|fetch failed|Network request failed/i.test(raw)) hint = '。可能是网络/CORS/代理问题：请用“启动网站.bat”以 http://localhost 打开本页，或在设置里切换接口模式。';
  else if(/401|Unauthorized|invalid.*key|api key/i.test(raw)) hint = '。请检查 API Key 是否正确、是否已充值。';
  else if(/402|Insufficient|balance|quota/i.test(raw)) hint = '。DeepSeek 账户余额/额度可能不足。';
  else if(/429|rate limit/i.test(raw)) hint = '。请求过于频繁，请稍后再试。';
  else if(/model/i.test(raw) && /not found|invalid|does not exist/i.test(raw)) hint = '。模型名可能已变化，请在设置中改用 deepseek-v4-pro 或 deepseek-flash。';
  else if(/HTTP 404/.test(raw)) hint = '。接口地址可能不对：默认应为 https://api.deepseek.com（会自动加 /chat/completions）；本地代理模式需要先用 server.mjs 启动服务。';
  return raw + hint;
}

/* ---------------- DeepSeek 调用 ---------------- */
async function callDeepSeek(messages, opts){
  opts = opts || {};
  const ep = endpointInfo();
  const body = buildBody(messages, opts);
  const headers = {'Content-Type':'application/json'};
  if(settings.apiKey) headers['Authorization'] = 'Bearer ' + settings.apiKey;
  const res = await fetch(ep.url, {method:'POST', headers, body: JSON.stringify(body), signal: opts.signal});
  if(!res.ok){
    let detail = '';
    try{ detail = (await res.text()).slice(0, 600); }catch(e){}
    throw new Error('HTTP ' + res.status + ' ' + detail);
  }
  if(!body.stream || !res.body || !res.body.getReader){
    const j = await res.json();
    const msg = (j.choices && j.choices[0] && j.choices[0].message) || {};
    return {content: msg.content || '', reasoning: msg.reasoning_content || ''};
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder('utf-8');
  let buf = '', content = '', reasoning = '';
  const handleLine = (line) => {
    if(!line || !line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if(!data || data === '[DONE]') return;
    let j; try{ j = JSON.parse(data); }catch(e){ return; }
    const d = (j.choices && j.choices[0] && j.choices[0].delta) || {};
    if(d.reasoning_content){ reasoning += d.reasoning_content; if(opts.onThinking) opts.onThinking(reasoning); }
    if(d.content){ content += d.content; if(opts.onDelta) opts.onDelta(content); }
  };
  while(true){
    const r = await reader.read();
    if(r.done) break;
    buf += dec.decode(r.value, {stream:true});
    let idx;
    while((idx = buf.indexOf('\n')) >= 0){
      handleLine(buf.slice(0, idx).replace(/\r$/, ''));
      buf = buf.slice(idx + 1);
    }
  }
  if(buf) handleLine(buf.replace(/\r$/, ''));
  return {content, reasoning};
}

/* ---------------- 聊天状态与渲染 ---------------- */
let history = [];
try{ history = JSON.parse(localStorage.getItem(STORE_HISTORY) || '[]') || []; }catch(e){ history = []; }
if(!Array.isArray(history)) history = [];
let busy = false, controller = null;
const elLog = $('#chatLog');

function persistHistory(){
  try{ localStorage.setItem(STORE_HISTORY, JSON.stringify(history.slice(-40))); }catch(e){}
}
function scrollLog(){ if(elLog) elLog.scrollTop = elLog.scrollHeight; }
function setStatus(t){ const el=$('#chatStatus'); if(el) el.textContent = t; }
function refreshStatus(){
  if(!settings.apiKey){ setStatus('DeepSeek · 未配置 API Key（可先用离线知识库）'); return; }
  setStatus('DeepSeek · ' + modelName() + ' · ' + (settings.thinking && isV4Model(modelName()) ? '思考 ' + settings.effort : '普通模式'));
}
function addMsg(role, content){
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + (role === 'user' ? 'user' : 'ai');
  const roleEl = document.createElement('div'); roleEl.className='role';
  roleEl.textContent = role === 'user' ? '你' : 'N1MM 助手';
  wrap.appendChild(roleEl);
  const think = document.createElement('details'); think.className='think'; think.style.display='none';
  think.innerHTML = '<summary>思考过程（reasoning_content）</summary><div></div>';
  wrap.appendChild(think);
  const body = document.createElement('div'); body.className='body';
  wrap.appendChild(body);
  const src = document.createElement('div'); src.className='src'; src.style.display='none';
  wrap.appendChild(src);
  if(content) body.innerHTML = md(content);
  elLog.appendChild(wrap); scrollLog();
  return {wrap, body, think, thinkBody: think.querySelector('div'), src};
}
function renderHistory(){
  if(!elLog) return;
  elLog.innerHTML = '';
  if(!history.length){
    addMsg('assistant', '你好！我是 N1MM Logger+ / 比赛 / LoTW 中文助手。你可以直接问，例如：\n\n- ARRL DX CW 的 Sent Exchange 怎么填？\n- 我在两个不同网格地点操作，怎样用同一套日志并分别上传 LoTW？\n- 两台电脑同时比赛，N1MM 怎么联网？\n\n先到右上角 ⚙ 填 DeepSeek API Key 效果最好；没有 Key 也可以，我会用本站知识库先回答。');
    return;
  }
  history.forEach(m => {
    const el = addMsg(m.role === 'user' ? 'user' : 'assistant', m.content || '');
    if(m.reasoning){ el.think.style.display=''; el.thinkBody.textContent = m.reasoning; }
  });
  scrollLog();
}
function offlineAnswer(q){
  const hits = searchKB(q, 3);
  let out = '未能从 DeepSeek 获取回答（未配置 API Key，或网络/额度不可用）。下面是本站知识库中与你的问题最相关的资料：\n\n';
  hits.forEach((e,i)=>{
    const excerpt = e.body.split('\n').slice(0,7).join('\n');
    out += '### ' + (i+1) + '. ' + e.title + '\n' + excerpt + '\n\n来源：' + e.src.map(s=>'[' + s.t + '](' + s.u + ')').join('、') + '\n\n';
  });
  out += '> 配置 DeepSeek API Key 后，AI 会结合这些资料给出更针对性的逐步答案。点右上角 ⚙ 设置。';
  return out;
}
function renderSources(el, hits){
  if(!hits || !hits.length){ el.style.display='none'; return; }
  const links = [];
  const seen = {};
  hits.forEach(h => h.src.forEach(s => { if(!seen[s.u]){ seen[s.u]=1; links.push('<a href="'+escapeAttr(s.u)+'" target="_blank" rel="noopener">'+escapeHtml(s.t)+'</a>'); } }));
  el.innerHTML = '参考资料：' + links.join(' · ');
  el.style.display = '';
}
async function sendMessage(text){
  text = String(text || '').trim();
  if(!text || busy) return;
  openChat();
  $('#chatInput').value = '';
  addMsg('user', text);
  history.push({role:'user', content:text}); persistHistory();
  const ai = addMsg('assistant', '');
  ai.body.innerHTML = '<div class="typing"><i></i><i></i><i></i></div>';
  const kb = settings.kb ? buildKBContext(text) : {text:'', hits:[]};
  const messages = buildMessages(kb.text);
  busy = true; controller = new AbortController(); updateSendBtn();
  setStatus('正在请求 DeepSeek…');
  try{
    if(!settings.apiKey) throw new Error('未配置 API Key');
    const r = await callDeepSeek(messages, {
      signal: controller.signal,
      onDelta: (c)=>{ ai.body.innerHTML = md(c); scrollLog(); },
      onThinking: (t)=>{ ai.think.style.display=''; ai.thinkBody.textContent = t; scrollLog(); }
    });
    const answer = r.content || '(模型没有返回文本内容)';
    ai.body.innerHTML = md(answer);
    if(r.reasoning){ ai.think.style.display=''; ai.thinkBody.textContent = r.reasoning; }
    renderSources(ai.src, kb.hits);
    history.push({role:'assistant', content:answer, reasoning:r.reasoning || ''}); persistHistory();
    refreshStatus(); scrollLog();
  }catch(err){
    if(err && err.name === 'AbortError'){
      ai.body.innerHTML = md('_已停止生成。_');
      setStatus('已停止');
    }else{
      const ans = offlineAnswer(text);
      ai.body.innerHTML = md(ans);
      renderSources(ai.src, searchKB(text, 3));
      history.push({role:'assistant', content:ans}); persistHistory();
      setStatus('连接失败，已使用离线知识库');
      toast('DeepSeek 调用失败：' + friendlyError(err), 5200);
    }
  }finally{
    busy = false; controller = null; updateSendBtn();
  }
}
function updateSendBtn(){
  const b = $('#chatSend'); if(!b) return;
  b.textContent = busy ? '停止' : '发送';
}
function openChat(){ const p=$('#chatPanel'); if(p){ p.classList.add('open'); const i=$('#chatInput'); if(i) setTimeout(()=>i.focus(), 60); } }
function closeChat(){ const p=$('#chatPanel'); if(p) p.classList.remove('open'); }

/* ---------------- 预设问题 ---------------- */
function renderPresets(){
  const mk = (p) => {
    const b = document.createElement('button');
    b.className = 'btn ghost small'; b.type='button'; b.textContent = p.label;
    b.addEventListener('click', ()=>sendMessage(p.q));
    return b;
  };
  const row = $('#presets'); if(row){ row.innerHTML=''; PRESETS.forEach(p=>{ const c=document.createElement('button'); c.className='chip'; c.type='button'; c.textContent=p.label; c.addEventListener('click',()=>sendMessage(p.q)); row.appendChild(c); }); }
  const grid = $('#aiPresetGrid'); if(grid){ grid.innerHTML=''; PRESETS.forEach(p=>grid.appendChild(mk(p))); }
}

/* ---------------- 设置界面 ---------------- */
function fillForm(){
  $('#apiKey').value = settings.apiKey || '';
  const known = ['deepseek-v4-pro','deepseek-flash','deepseek-chat','deepseek-reasoner'];
  if(known.indexOf(settings.model) >= 0){ $('#modelSel').value = settings.model; $('#customModelField').style.display='none'; }
  else { $('#modelSel').value = '__custom'; $('#customModel').value = settings.model || ''; $('#customModelField').style.display=''; }
  $('#customModel').value = settings.customModel || $('#customModel').value || '';
  $('#apiMode').value = settings.apiMode || 'auto';
  $('#baseUrl').value = settings.baseUrl || 'https://api.deepseek.com';
  $('#streamOn').checked = !!settings.stream;
  $('#thinkingOn').checked = !!settings.thinking;
  $('#effortSel').value = settings.effort || 'high';
  $('#tempInput').value = settings.temperature;
  $('#kbOn').checked = !!settings.kb;
  $('#sysPrompt').value = settings.sysPrompt || DEFAULT_SYS_PROMPT;
  $('#tempInput').disabled = !!settings.thinking;
}
function readForm(){
  settings.apiKey = $('#apiKey').value.trim();
  settings.model = $('#modelSel').value;
  settings.customModel = $('#customModel').value.trim();
  settings.apiMode = $('#apiMode').value;
  settings.baseUrl = $('#baseUrl').value.trim() || 'https://api.deepseek.com';
  settings.stream = $('#streamOn').checked;
  settings.thinking = $('#thinkingOn').checked;
  settings.effort = $('#effortSel').value;
  settings.temperature = Number($('#tempInput').value || 0.3);
  settings.kb = $('#kbOn').checked;
  settings.sysPrompt = $('#sysPrompt').value.trim() || DEFAULT_SYS_PROMPT;
}
async function testConnection(){
  if(!settings.apiKey){ toast('请先填写 DeepSeek API Key'); return; }
  setStatus('正在测试连接…');
  try{
    const r = await callDeepSeek([{role:'system',content:'你只回复四个字：连接正常'},{role:'user',content:'测试'}], {forceNonStream:true});
    toast('连接正常：' + (r.content || '').replace(/\s+/g,' ').slice(0,30));
    refreshStatus();
  }catch(e){ toast('连接失败：' + friendlyError(e), 5600); setStatus('连接失败'); }
}

/* ---------------- 页面交互 ---------------- */
function bind(){
  $('#chatFab').addEventListener('click', openChat);
  $('#openChatHero').addEventListener('click', openChat);
  $('#openChatBtn2').addEventListener('click', openChat);
  $('#openChatSettings').addEventListener('click', ()=>{ openChat(); $('#chatDrawer').classList.add('open'); });
  $('#btnClose').addEventListener('click', closeChat);
  $('#btnSettings').addEventListener('click', ()=>$('#chatDrawer').classList.add('open'));
  $('#btnDrawerClose').addEventListener('click', ()=>$('#chatDrawer').classList.remove('open'));
  $('#btnSaveSettings').addEventListener('click', ()=>{ readForm(); saveSettings(); fillForm(); refreshStatus(); toast('设置已保存'); });
  $('#btnTest').addEventListener('click', ()=>{ readForm(); saveSettings(); refreshStatus(); testConnection(); });
  $('#btnClear').addEventListener('click', ()=>{ if(confirm('清空当前对话记录？')){ history = []; persistHistory(); renderHistory(); } });
  $('#btnExport').addEventListener('click', ()=>{
    const text = '# N1MM 助手对话记录\n\n' + history.map(m=>'## ' + (m.role==='user'?'你':'N1MM 助手') + '\n\n' + (m.content||'')).join('\n\n');
    download('n1mm-chat-' + new Date().toISOString().slice(0,10) + '.md', text);
  });
  $('#modelSel').addEventListener('change', ()=>{ $('#customModelField').style.display = $('#modelSel').value === '__custom' ? '' : 'none'; });
  $('#thinkingOn').addEventListener('change', ()=>{ $('#tempInput').disabled = $('#thinkingOn').checked; });
  $('#chatSend').addEventListener('click', ()=>{
    if(busy && controller){ controller.abort(); return; }
    sendMessage($('#chatInput').value);
  });
  $('#chatInput').addEventListener('keydown', (e)=>{ if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); if(!busy) sendMessage($('#chatInput').value); } });
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape'){ $('#chatDrawer').classList.remove('open'); closeChat(); } });
  $$('[data-copy-target]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const t = $(btn.getAttribute('data-copy-target'));
      if(!t) return;
      copyText(t.innerText).then(()=>{ btn.textContent='已复制'; setTimeout(()=>btn.textContent='复制', 1400); toast('已复制到剪贴板'); }).catch(()=>toast('复制失败，请手动选择'));
    });
  });
  $('#menuBtn').addEventListener('click', ()=>$('#topnav').classList.toggle('open'));
  $$('#topnav a').forEach(a=>a.addEventListener('click', ()=>$('#topnav').classList.remove('open')));
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach(en=>{
      if(en.isIntersecting){
        $$('#toc a').forEach(a=>a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
      }
    });
  }, {rootMargin:'-20% 0px -70% 0px', threshold:0});
  ['about','start','daily','contest','multi','lotw','faq','ai','sources'].forEach(id=>{ const el=document.getElementById(id); if(el) obs.observe(el); });
}

/* ---------------- 本机环境检测与个性化 ---------------- */
const STORE_PROFILE = 'n1mm-guide.profile.v1';
const DEMO_ENV = {
  ok:true, demo:true, generatedAt:'2026-01-01T00:00:00Z',
  host:{platform:'win32',release:'10.0.26100',arch:'x64',node:'v22.0.0'},
  n1mm:{
    installed:true, version:'1.0.11364', installDir:'C:\\Program Files (x86)\\N1MM Logger+',
    installDirDisplay:'C:\\Program Files (x86)\\N1MM Logger+',
    dataDir:'~/Documents/N1MM Logger+', dataDirDisplay:'~/Documents/N1MM Logger+',
    databases:[
      {name:'N1MM Admin.s3db',size:4005888,system:true,mtime:''},
      {name:'N1MM DXLog.s3db',size:159744,system:true,mtime:''},
      {name:'MyCall-DX.s3db',size:262144,system:false,mtime:''}
    ],
    hasUserDatabase:true, exportFileCount:4, operator:'XX1XX', lastVersionExecuted:'1.0.11364', recentContest:'ARRL-DX-CW', recentContestDate:'2026-02-21'
  },
  tqsl:{installed:true,version:'2.8.6',exePath:'C:\\Program Files (x86)\\TrustedQSL\\tqsl.exe',configDir:'~/AppData/Roaming/TrustedQSL',configFound:true},
  guidance:[
    {level:'ok',text:'（演示）已检测到 N1MM Logger+ 1.0.11364。'},
    {level:'ok',text:'（演示）用户数据目录已找到：~/Documents/N1MM Logger+，数据库 3 个。'},
    {level:'ok',text:'（演示）检测到个人数据库，可直接新建比赛/日常日志。'},
    {level:'ok',text:'（演示）检测到 TQSL 2.8.6。'}
  ],
  privacy:'演示模式：所有数据均为示例，不会读取本机。'
};
let env = { status:'idle', data:null, error:'', demo:false };
let profile = { call:'', grid:'', contest:'', useInAI:true };
try{ const saved=JSON.parse(localStorage.getItem(STORE_PROFILE)||'{}'); profile=Object.assign(profile, saved||{}); }catch(e){}
function isDemoMode(){ try{ return new URLSearchParams(location.search).get('demo')==='1'; }catch(e){ return false; } }
function envData(){ return env.demo ? DEMO_ENV : env.data; }
function setEnvText(key,val){ $$('[data-env="'+key+'"]').forEach(el=>{ el.textContent=val; el.title=val; }); }
function saveProfile(){ try{ localStorage.setItem(STORE_PROFILE, JSON.stringify(profile)); }catch(e){} }
function renderGuidance(g){
  const box=$('#envGuidance'); if(!box) return;
  const icon={ok:'✅',tip:'💡',warn:'⚠️',error:'⛔'};
  box.innerHTML=(g||[]).map(x=>'<div class="mini"><p style="margin:0"><b>'+(icon[x.level]||'•')+'</b> '+escapeHtml(x.text)+'</p></div>').join('');
}
function renderProfile(){
  const c=$('#profileCall'); if(c) c.value = profile.call || '';
  const g=$('#profileGrid'); if(g) g.value = profile.grid || '';
  const k=$('#profileContest'); if(k) k.value = profile.contest || '';
  const u=$('#useEnvInAI'); if(u) u.checked = profile.useInAI !== false;
}
function renderEnvironment(){
  const hero=$('#heroBadge'), state=$('#detectState'), fallback=$('#envFallback');
  const d=envData();
  if(env.status==='loading'){
    if(hero) hero.textContent='正在检测本机 N1MM…';
    if(state){ state.textContent='检测中…'; state.className='badge'; }
    if(fallback) fallback.style.display='';
    return;
  }
  if(!d){
    if(hero) hero.textContent='未检测到本机环境（可手动填写）';
    if(state){ state.textContent='自动检测不可用'; state.className='badge red'; }
    setEnvText('n1mmVersion','未检测到（请用本地服务器打开）');
    setEnvText('installDir','未检测到'); setEnvText('dataDir','未检测到');
    setEnvText('databases','未检测到'); setEnvText('operator', profile.call || '未检测到'); setEnvText('tqsl','未检测到');
    renderGuidance([{level:'warn',text:'无法自动检测：请通过 启动网站.bat / start.sh 以 http://127.0.0.1 打开本页。'},{level:'tip',text:'也可以在下方手动填写呼号/网格，教程与 AI 会据此做通用个性化。'}]);
    if(fallback) fallback.style.display='';
    return;
  }
  const n=d.n1mm||{}, t=d.tqsl||{};
  const userDbs=(n.databases||[]).filter(x=>!x.system);
  const op=profile.call || n.operator || '';
  if(env.demo){
    if(hero) hero.textContent='演示模式 · 通用示例数据';
    if(state){ state.textContent='演示模式'; state.className='badge amber'; }
  }else{
    if(hero) hero.textContent = n.installed ? ('本机检测 · N1MM Logger+ ' + (n.version||'')) : '未检测到 N1MM Logger+';
    if(state){ state.textContent = n.installed ? '已检测到本机 N1MM' : '未检测到 N1MM'; state.className='badge '+(n.installed?'green':'amber'); }
  }
  setEnvText('n1mmVersion', n.installed ? ('N1MM Logger+ ' + (n.version||'（版本未知）')) : '未检测到');
  setEnvText('installDir', n.installDirDisplay || '未检测到');
  setEnvText('dataDir', n.dataDirDisplay || '未检测到');
  setEnvText('databases', (n.databases&&n.databases.length) ? (n.databases.length+' 个（个人库 '+userDbs.length+'）') : '未检测到');
  setEnvText('operator', op || '未检测到（可在下方填写）');
  setEnvText('tqsl', t.installed ? ('已安装 ' + (t.version || '') + (t.configFound ? ' · 有配置' : ' · 无配置')).replace(/\s+/g,' ').trim() : '未检测到');
  const c=$('#profileCall'); if(c && !c.value && n.operator) c.value=n.operator;
  renderGuidance(d.guidance);
  if(fallback) fallback.style.display='none';
}
async function loadDetection(){
  if(isDemoMode()){ env.demo=true; env.status='demo'; renderEnvironment(); return; }
  env.demo=false; env.status='loading'; renderEnvironment();
  try{
    const r=await fetch('/api/detect',{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    const j=await r.json();
    if(!j||!j.ok) throw new Error((j&&j.error)||'检测失败');
    env.data=j; env.status='ok';
  }catch(e){ env.data=null; env.status='unavailable'; env.error=String(e&&e.message||e); }
  renderEnvironment();
}
function envForAI(){
  const d=envData();
  if(!d || profile.useInAI===false) return '';
  const n=d.n1mm||{}, t=d.tqsl||{};
  const userDbs=(n.databases||[]).filter(x=>!x.system);
  const lines=['【用户本机环境（由本地服务器自动检测；不含 QSO 内容）】'];
  lines.push('- N1MM Logger+：'+(n.installed?(n.version||'已安装'):'未检测到'));
  if(n.installDirDisplay) lines.push('- 安装目录：'+n.installDirDisplay);
  if(n.dataDirDisplay) lines.push('- 用户数据目录：'+n.dataDirDisplay);
  lines.push('- 数据库：共 '+((n.databases||[]).length)+' 个，个人库 '+userDbs.length+' 个'+(userDbs.length?('（'+userDbs.map(x=>x.name).join('、')+'）'):''));
  const op=profile.call||n.operator||'';
  if(op) lines.push('- 呼号：'+op);
  if(profile.grid) lines.push('- 网格：'+profile.grid);
  if(profile.contest) lines.push('- 常参加比赛：'+profile.contest);
  if(n.recentContest) lines.push('- 最近使用的比赛类型：'+n.recentContest+(n.recentContestDate?('（'+n.recentContestDate+'）'):''));
  lines.push('- TQSL：'+(t.installed?('已安装 '+(t.version||'')+(t.configFound?'，已发现配置目录':'，未发现配置目录')).replace(/\s+/g,' ').trim():'未检测到'));
  if(Array.isArray(d.guidance)&&d.guidance.length) lines.push('- 本机个性化建议：'+d.guidance.map(x=>x.text).join('；'));
  lines.push('请在回答中直接结合以上版本、路径、呼号与建议，明确告诉该用户下一步应该做什么；不要编造未检测到的信息。');
  return lines.join('\n');
}
function bindProfile(){
  const onChange=()=>{
    const c=$('#profileCall'), g=$('#profileGrid'), k=$('#profileContest'), u=$('#useEnvInAI');
    profile.call=c?c.value.trim():''; profile.grid=g?g.value.trim():''; profile.contest=k?k.value.trim():'';
    profile.useInAI=u?!!u.checked:true;
    saveProfile(); renderEnvironment(); refreshStatus();
  };
  ['profileCall','profileGrid','profileContest','useEnvInAI'].forEach(id=>{ const el=$('#'+id); if(el){ el.addEventListener('change',onChange); if(el.tagName==='INPUT'&&el.type==='text') el.addEventListener('blur',onChange); } });
}
function initDetection(){
  renderProfile();
  bindProfile();
  const b=$('#btnDetect'); if(b) b.addEventListener('click',()=>loadDetection());
  loadDetection();
}

/* ---------------- 初始化 ---------------- */
(function init(){
  renderPresets();
  fillForm();
  renderHistory();
  refreshStatus();
  bind();
  initDetection();
  if(!KB.length) console.warn('知识库为空');
})();
