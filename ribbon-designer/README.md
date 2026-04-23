# ArcGIS Pro Add-in Ribbon 布局设计器原型

这是一个用于设计 ArcGIS Pro Add-in 功能区布局的前端原型。项目当前重点不是生成最终 `Config.daml`，而是先把 Ribbon 的控件类型、尺寸比例、分组层级、拖拽布局、容量限制和 JSON 导入导出做清楚，方便后续继续补动作事件、DAML 转换和 AI 辅助配置。

## 项目目标

- 做一个接近 ArcGIS Pro 功能区使用习惯的 Ribbon 布局编辑器。
- 用中文界面描述 Add-in 控件、分组和布局规则。
- 让用户可以从组件库拖拽控件到画布，按真实比例放置。
- 用最小按钮格作为基础单位，让控件像俄罗斯方块一样按整格吸附。
- 输出 AI 友好的 JSON，用于后续补全命令类、事件绑定和配置生成。

## 当前范围

第一版只处理 Ribbon，不包含 DockPane、ProWindow、EmbeddableControl 等窗口类组件。

当前已经包含：

- 顶部 ArcGIS Pro 风格页签区。
- 默认打开迁移版 Spike：左侧主画布，右侧组件库和属性面板。
- 旧版手写 `dnd-kit` 原型保留在 `?legacy=1`。
- 组件库按控件类型分组展示。
- 画布按 `Tab -> Group -> Subgroup -> Control` 建模。
- 控件拖入、组内排序、复制、删除。
- 属性面板编辑标题、提示、条件、尺寸、行为占位和事件绑定。
- JSON 导入、复制、导出。
- 本地存储自动保存。
- 宽屏、标准、紧凑、折叠预览模式。

## 核心布局规则

画布现在使用固定槽位系统：

- 最小按钮空间为 `1x1`。
- 当前 CSS 中 `1格 = 32px x 32px`。
- 每个 `Subgroup` 默认容量为 `6列 x 3行`。
- 子组顶部显示容量，例如 `4/6列 · 3行高`。
- 子组顶部有 1-6 的列尺，方便观察长度边界。
- 控件只能按整格占位，拖放时自动吸附。
- 超出当前子组容量时会提示不能放入。

常用控件尺寸示例：

| 控件尺寸 | 占格 |
| --- | --- |
| 小按钮 | `1x1` |
| 中按钮 | `2x1` |
| 大按钮 | `2x3` |
| 菜单/分裂按钮大号 | `2x2` |
| 下拉框/输入框中号 | `3x1` |
| 下拉框/输入框大号 | `4x1` |
| 画廊/工具板大号 | `3x3` |

## 控件类型

组件库当前包含：

- 按钮
- 交互工具
- 分裂按钮
- 工具板
- 菜单
- 画廊
- 下拉框
- 输入框
- 复选框

这些控件不是纯文字卡片，而是用简化 UI 模拟 ArcGIS Pro Ribbon 控件的显示形态，并且在组件库和画布中共用同一套尺寸比例。

## 数据模型

内部状态和导出 JSON 使用同一套结构，主要包括：

- `metadata`
- `tabs[]`
- `groups[]`
- `subgroups[]`
- `controls[]`

导出元信息固定包含：

```json
{
  "app": "gispro-ribbon-designer",
  "schemaVersion": "1.0"
}
```

控件节点包含：

- `id`
- `type`
- `caption`
- `size`
- `tooltip`
- `condition`
- `icon.small`
- `icon.large`
- `behavior`
- `eventBindings`
- `aiNotes`

`behavior` 当前是占位结构，用于后续连接 Add-in 命令实现：

- `commandType`
- `className`
- `target`
- `arguments`

## 目录说明

```text
src/
  App.tsx          主界面、拖拽逻辑、属性面板、JSON 导入导出
  App.css          ArcGIS Pro 风格界面、槽位网格和控件比例
  library.ts       Ribbon 控件库定义
  ribbon.ts        文档模板、尺寸解析、导入校验
  types.ts         Ribbon 数据类型
tests/
  ribbon-smoke.spec.ts  Playwright 主流程测试
```

## 运行方式

安装依赖：

```powershell
npm install
```

启动开发预览：

```powershell
npm run dev -- --host 127.0.0.1 --port 4173
```

打开：

[http://127.0.0.1:4173/](http://127.0.0.1:4173/)

## 验证命令

构建：

```powershell
npm run build
```

代码检查：

```powershell
npm run lint
```

Playwright 主流程测试：

```powershell
npm run test:smoke
```

当前主流程测试覆盖：

- 页面可以打开。
- 默认 Add-in 模板可见。
- 组件库中文分组可见。
- 从组件库拖入按钮到子组。
- 大按钮保持 `2x3` 比例，对应 `64px x 96px`。
- JSON 预览包含 `schemaVersion: "1.0"`。
- JSON 可以导出下载。

## 后续计划

建议下一步继续完善：

- 更精确的 ArcGIS Pro Ribbon 收缩规则。
- 更细的拖放落点计算，而不是只按目标子组末尾插入。
- 控件之间的碰撞预览和占位阴影。
- DAML/XML 生成器。
- 命令类、事件、条件表达式的可视化配置。
- DockPane、ProWindow、EmbeddableControl 等 Add-in 其他组件。
- 模板库和示例项目导入。

## 迁移版 Spike

当前默认入口已经开始按迁移规划落地：

- `@puckeditor/core`：负责可视化编辑器底座、组件注册和属性字段。
- `react-grid-layout`：负责 `Subgroup` 内 `6列 x 3行` 的真实槽位、碰撞和吸附。
- 当前 `RibbonDocument`：继续作为业务 JSON 和 DAML 生成的领域模型。

当前迁移版已可用能力：

- 右侧组件库拖拽控件到左侧 `Subgroup`。
- 子组使用真实 `x/y/w/h` 槽位。
- 大按钮保持 `2x3`，输入框、画廊等按控件类型映射尺寸。
- 画布内控件可拖动重新定位。
- 属性面板可编辑标题、尺寸、提示、条件和 AI 备注。
- JSON 实时预览、复制、导出。
- Puck 组件配置层已接入 `RibbonButton / RibbonEditBox / RibbonGallery`，后续可继续替换右侧属性面板和组件注册。

详细方案见：

[MIGRATION_PLAN.md](./MIGRATION_PLAN.md)
