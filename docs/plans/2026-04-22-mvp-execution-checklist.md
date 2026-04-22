# 跨平台远程协同控制系统可执行开发清单

## 1. 文档目标

本清单用于将当前“原始需求”转化为一份可以直接执行的开发任务列表，不按周拆分，不做宽泛阶段口号，直接按实际依赖顺序推进。

当前仓库已有内容：

- `client`：React + Vite + Electron 壳
- `server`：Node.js + Socket.IO 基础信令
- 已有雏形：连接码创建/加入、基础 UI、简单 WebRTC 连接、简单鼠标键盘控制

当前缺失的核心能力：

- 完整会话状态机
- 受控端授权确认流程
- 可靠的 WebRTC 主链路
- Electron 能力层封装
- 权限检查与异常处理
- 控制协议、坐标映射、多显示器处理
- 稳定性、日志、测试、打包验证

## 2. 本次实现边界

本轮只实现 `MVP`，目标是把“远程桌面主链路”完整打通并做到可稳定演示。

### 2.1 必做范围

- 连接码创建与加入
- 单会话远程连接
- 受控端授权确认
- 屏幕共享
- 鼠标控制
- 键盘控制
- 连接状态展示
- 断开与异常恢复
- Electron 权限检查
- 基础日志

### 2.2 明确不做

- `mediasoup`
- `Redis`
- `PostgreSQL`
- `JWT` 登录体系
- 文件传输
- 剪贴板同步
- 语音/视频通话
- 会话录制
- 多会话并发
- 集群化部署

## 3. MVP 验收标准

满足以下条件即可视为 MVP 完成：

1. 两个客户端可以通过连接码建立会话。
2. 受控端可以看到连接请求，并可接受或拒绝。
3. 主控端可以看到受控端屏幕画面。
4. 主控端鼠标移动、点击、滚轮可在受控端生效。
5. 主控端键盘输入和常用特殊键可在受控端生效。
6. 会话断开后，双方 UI 和连接状态可恢复到可再次连接状态。
7. 权限缺失时，客户端能明确提示，而不是静默失败。
8. 至少完成一条本机 Electron 构建链路验证。

## 4. 总体执行顺序

执行时严格按下面顺序推进，前一项未闭环，不进入后面依赖它的任务。

1. 统一协议和状态定义
2. 重构服务端会话管理
3. 重构前端状态管理与通信层
4. 封装 Electron 系统能力
5. 打通远程桌面主链路
6. 修正控制精度与权限问题
7. 补稳定性、日志、测试和构建验证

## 5. 可执行任务清单

## 任务 A：统一协议、状态和模块边界

### 目标

让服务端、前端、Electron 三端有一致的事件定义和状态流转，避免继续在字符串和临时回调上堆逻辑。

### 要做的事

- 定义会话角色：
  - `controlled`
  - `controller`
- 定义会话状态：
  - `idle`
  - `waiting`
  - `requesting`
  - `pending_accept`
  - `connecting`
  - `connected`
  - `controlling`
  - `disconnected`
  - `error`
- 定义 Socket 事件：
  - `session:create`
  - `session:join`
  - `session:request`
  - `session:accept`
  - `session:reject`
  - `session:leave`
  - `session:state`
  - `session:error`
  - `webrtc:signal`
- 定义控制指令协议：
  - `mouse:move`
  - `mouse:down`
  - `mouse:up`
  - `mouse:click`
  - `mouse:wheel`
  - `keyboard:down`
  - `keyboard:up`
  - `keyboard:tap`
- 定义前后端模块职责：
  - `server` 只负责信令和会话管理
  - `client/src` 负责 UI、状态协调、WebRTC
  - `client/electron` 负责屏幕、输入、权限、系统 API

### 交付物

- 一份协议定义文件，建议放在 `docs/` 或前后端共享常量目录
- 一份状态枚举常量
- 一份控制消息类型定义

### 完成标准

- 新功能不再新增“拍脑袋命名”的 socket 事件
- 前后端代码都使用统一状态和事件名

## 任务 B：重构服务端会话管理

### 目标

把当前 demo 级 `socket` 处理器改成真正可维护的会话管理层。

### 要做的事

- 从 `server/src/socket/index.js` 拆出：
  - `sessionManager`
  - `codeGenerator`
  - `socketHandlers`
- 为会话对象补充结构：
  - `sessionCode`
  - `controlledSocketId`
  - `controllerSocketId`
  - `status`
  - `createdAt`
  - `expiresAt`
  - `lastActiveAt`
- 增加连接码校验与过期逻辑
- 限制一个连接码同一时间只能存在一个主控端
- 增加会话主动关闭逻辑
- 增加受控端离线时的回收逻辑
- 增加主控端掉线后的清理逻辑
- 增加统一错误返回结构
- 增加统一状态广播逻辑

### 建议文件结构

- `server/src/socket/index.js`
- `server/src/socket/sessionManager.js`
- `server/src/socket/events.js`
- `server/src/socket/codeGenerator.js`
- `server/src/socket/errors.js`

### 完成标准

- `index.js` 只做入口注册，不再塞所有逻辑
- 会话创建、加入、断开都有明确状态变更
- 对非法连接码、重复加入、超时连接都有明确返回

## 任务 C：重构前端远控状态管理

### 目标

避免 `useRemoteControl` 继续同时承担页面状态、Socket、WebRTC、Electron 控制、输入映射等所有职责。

### 要做的事

- 拆分当前 `client/src/hooks/useRemoteControl.js`
- 形成至少三层职责：
  - 页面编排层：管理当前页面和用户交互
  - 会话层：管理连接状态、信令、授权流程
  - WebRTC 层：管理 peer、stream、signal、data channel
- 把连接状态、错误信息、远端信息统一收口
- 去掉直接 `window.location.reload()` 的做法
- 补齐对端断开、授权拒绝、连接失败等状态处理
- 让 UI 根据状态枚举渲染，而不是散落判断

### 建议拆分

- `client/src/hooks/useRemoteControl.js`
- `client/src/hooks/useSessionState.js`
- `client/src/hooks/usePeerSession.js`
- `client/src/lib/controlProtocol.js`
- `client/src/lib/sessionEvents.js`

### 完成标准

- 每个 hook 只负责一层逻辑
- 会话销毁可以通过明确方法完成，不再靠页面重载恢复
- 页面能正确展示等待中、请求中、已连接、已断开、错误等状态

## 任务 D：封装 Electron 系统能力层

### 目标

把系统能力从“前端随手调用 IPC”升级为清晰、安全、可扩展的能力接口。

### 要做的事

- 重构 `client/electron/main.cjs` 与 `preload.cjs`
- 将能力拆分为三组 API：
  - `screen`
  - `control`
  - `permission`
- `screen` 需要提供：
  - 获取屏幕源列表
  - 获取显示器信息
  - 获取默认屏幕
- `control` 需要提供：
  - 执行鼠标事件
  - 执行键盘事件
  - 基础错误回传
- `permission` 需要提供：
  - 屏幕录制权限检测
  - 输入控制权限检测
  - 权限缺失时的提示信息
- preload 只暴露白名单 API，不暴露泛用 `ipcRenderer`

### 完成标准

- 前端只通过 `window.electron.screen/control/permission` 调用系统能力
- 无权限时前端能拿到结构化结果
- 主进程日志能看到关键失败原因

## 任务 E：实现受控端授权流程

### 目标

建立真正可用的“请求连接 -> 受控端确认 -> 允许开始共享/控制”链路。

### 要做的事

- 主控端发起加入请求后，服务端先通知受控端
- 受控端展示确认卡片/弹窗：
  - 谁在请求连接
  - 连接码
  - 权限模式（仅查看 / 可控制，MVP 至少预留字段）
- 受控端可以：
  - 接受
  - 拒绝
- 只有接受后，才创建屏幕流和 WebRTC 连接
- 被拒绝后，主控端收到明确提示

### 涉及文件

- `client/src/components/AllowControlCard.jsx`
- `client/src/components/LoginModal.jsx`
- `client/src/pages/DashboardPage.jsx`
- `client/src/hooks/useRemoteControl.js`
- `server/src/socket/*`

### 完成标准

- 没有受控端授权时，主控端不能直接拿到画面
- 接受、拒绝、超时都有明确 UI 和状态

## 任务 F：打通 WebRTC 视频流与控制通道

### 目标

建立稳定的远程画面传输和控制指令通道。

### 要做的事

- 重构当前 `simple-peer` 建连逻辑
- 明确谁是 initiator，谁负责先发 signal
- 分离两条通道：
  - 媒体流：传屏幕画面
  - DataChannel：传控制指令
- 补全事件处理：
  - `signal`
  - `stream`
  - `connect`
  - `data`
  - `close`
  - `error`
- 统一 peer 销毁逻辑
- 断开时关闭 track、peer、UI 状态

### 完成标准

- 主控端能稳定看到远程画面
- DataChannel 可持续接收控制指令
- 断开不会留下残留 peer 或残留屏幕采集

## 任务 G：实现鼠标键盘控制协议

### 目标

让主控端操作能够准确地映射并执行到受控端。

### 要做的事

- 在主控端采集鼠标事件：
  - 移动
  - 按下
  - 抬起
  - 点击
  - 滚轮
- 在主控端采集键盘事件：
  - 按下
  - 抬起
  - 单次敲击
- 统一协议格式，避免前端直接传 UI 事件对象
- 在受控端主进程做键位映射和容错
- 处理常用特殊键：
  - `Enter`
  - `Tab`
  - `Escape`
  - `Backspace`
  - `Arrow*`
  - `Control`
  - `Shift`
  - `Alt`
  - `Meta`

### 完成标准

- 基础文本输入可用
- 常见点击、拖动、滚轮可用
- 不支持的键位会给出日志，不会直接崩溃

## 任务 H：处理坐标映射、多显示器和分辨率问题

### 目标

把“能控制”提升到“控制准确”。

### 要做的事

- 获取受控端显示器分辨率和位置信息
- 建立视频展示区域坐标到真实屏幕坐标的映射
- 处理缩放显示、留黑边、容器裁剪等情况
- MVP 先支持主屏准确控制
- 预留多显示器切换结构，但首版可以只控制当前共享屏幕

### 完成标准

- 鼠标落点和远端真实位置基本一致
- 不因视频缩放导致点击偏移明显

## 任务 I：补齐权限与错误处理

### 目标

解决“代码看起来没报错，但产品根本不能用”的问题。

### 要做的事

- 检测并提示 macOS 屏幕录制权限
- 检测并提示 macOS 辅助功能权限
- 在 Windows/Linux 提供能力缺失的兜底提示
- 统一错误提示结构：
  - 错误码
  - 用户提示文案
  - 日志文案
- 对以下场景做兜底：
  - 获取不到屏幕源
  - robot 控制失败
  - WebRTC 建连失败
  - Socket 断连
  - 会话超时

### 完成标准

- 常见失败场景都能在 UI 中看到明确提示
- 日志能帮助定位失败点

## 任务 J：补日志、测试和构建验证

### 目标

让本项目从“手工试出来能跑”升级成“可验证、可回归”。

### 要做的事

- 服务端增加关键日志：
  - 创建会话
  - 加入会话
  - 授权结果
  - 状态切换
  - 断开原因
- Electron 主进程增加关键日志：
  - 权限检测
  - 获取屏幕源
  - 控制执行异常
- 前端增加关键错误展示
- 增加服务端单元测试：
  - 会话创建
  - 加入校验
  - 重复加入
  - 断开回收
- 增加前端基础测试：
  - 状态机流转
  - 关键 hook 行为
- 完成至少一次本地构建验证：
  - `server` 启动正常
  - `client` 开发模式正常
  - Electron 生产构建正常

### 完成标准

- 至少具备最小回归验证能力
- 构建出来的应用可以跑通一条完整链路

## 6. 建议执行依赖关系

如果多人并行，可以按依赖拆分，但单人推进时建议照下面顺序执行：

1. 任务 A：统一协议、状态和模块边界
2. 任务 B：重构服务端会话管理
3. 任务 C：重构前端远控状态管理
4. 任务 D：封装 Electron 系统能力层
5. 任务 E：实现受控端授权流程
6. 任务 F：打通 WebRTC 视频流与控制通道
7. 任务 G：实现鼠标键盘控制协议
8. 任务 H：处理坐标映射、多显示器和分辨率问题
9. 任务 I：补齐权限与错误处理
10. 任务 J：补日志、测试和构建验证

## 7. 当前代码对应的优先改造点

### 服务端

- 当前文件：[server/src/socket/index.js](/Users/zhanqi/Documents/gitlab/qi-rdp/server/src/socket/index.js)
- 问题：逻辑全部堆在一个文件里，只能支撑 demo
- 优先动作：拆会话管理与事件处理

### 前端

- 当前文件：[client/src/hooks/useRemoteControl.js](/Users/zhanqi/Documents/gitlab/qi-rdp/client/src/hooks/useRemoteControl.js)
- 问题：状态、Socket、WebRTC、Electron 控制、输入映射高度耦合
- 优先动作：拆 hook 和协议层

### Electron

- 当前文件：
  - [client/electron/main.cjs](/Users/zhanqi/Documents/gitlab/qi-rdp/client/electron/main.cjs)
  - [client/electron/preload.cjs](/Users/zhanqi/Documents/gitlab/qi-rdp/client/electron/preload.cjs)
- 问题：能力暴露过于粗糙，权限和错误处理不足
- 优先动作：按 `screen/control/permission` 三组 API 重构

## 8. 完成定义

以下全部达成，才算本轮开发结束：

1. 清单中的 A 到 J 均已完成。
2. 两端可完成完整连接、授权、共享、控制、断开流程。
3. 至少一个平台完成 Electron 构建和联调验证。
4. 没有依赖页面重载来恢复状态。
5. 常见失败场景有可见错误提示。

## 9. 后续扩展入口

MVP 完成后，再继续进入以下扩展项：

- 文件传输
- 剪贴板同步
- 音频通话
- 连接密码/验证码策略
- 多显示器切换 UI
- TURN 穿透
- 用户体系
- 会话录制
- 服务端存储与集群
