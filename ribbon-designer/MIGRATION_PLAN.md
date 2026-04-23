# 迁移方案：基于 Puck + react-grid-layout 重做 Ribbon 设计器

## 1. 为什么要迁移

当前原型已经证明了 Ribbon 控件库、中文属性面板、JSON 导入导出、网格槽位和 ArcGIS Pro 风格预览的基本方向，但继续在现有 `dnd-kit + 手写 CSS 网格` 上一点点打磨，会遇到几个问题：

- 编辑器壳、组件树、属性面板、拖拽状态都要自己维护。
- 子组内的碰撞、吸附、容量限制、拖入预览会越来越复杂。
- 后续要做 DAML 生成、事件绑定、模板库时，当前代码容易继续膨胀。
- 用户真正需要的是一个稳定的 Add-in Ribbon 设计器，而不是长期手写一个通用编辑器框架。

因此建议迁移到成熟开源底座：

- `Puck`：负责可视化编辑器壳、组件注册、属性表单、JSON 数据。
- `react-grid-layout`：负责 `Subgroup` 内部的 1x1 槽位、碰撞、吸附和容量限制。
- 当前项目：保留 Ribbon 业务模型、控件库、中文文案、ArcGIS Pro 风格视觉和导入导出结构。

## 2. 推荐技术路线

### 2.1 最推荐路线

采用：

```text
React + Vite + TypeScript
@puckeditor/core
react-grid-layout
自定义 Ribbon 组件库
自定义 JSON 转换层
```

版本核对：

```text
@puckeditor/core: 0.21.2
react-grid-layout: 2.2.3
核对时间：2026-04-23
核对方式：npm view
```

Puck 负责：

- 组件面板。
- 组件配置。
- 属性字段。
- 组件分类。
- 编辑器选择态。
- 基础拖拽编辑体验。
- JSON 状态保存。
- `fields/defaultProps/resolveFields/resolveData` 这类属性编辑和动态字段。
- `slot` 嵌套结构，用于承载 `Tab -> Group -> Subgroup -> Control`。

react-grid-layout 负责：

- `Subgroup` 内控件布局。
- `x / y / w / h` 网格坐标。
- `cols = 6`。
- `maxRows = 3`。
- `rowHeight = 32`。
- `preventCollision = true`。
- `noCompactor` 或自定义固定槽位 compactor。
- 外部拖入控件后的落点和碰撞检查。

项目自定义部分负责：

- ArcGIS Pro 风格 Ribbon 外观。
- `Tab -> Group -> Subgroup -> Control` 业务层级。
- 控件尺寸映射。
- Ribbon 预览模式。
- JSON schema 兼容。
- 后续 DAML/XML 生成。

关键判断：

- Puck 适合做“编辑器底座”，不适合直接替代 ArcGIS Pro Ribbon 布局引擎。
- react-grid-layout 适合做“显式槽位引擎”，不应当被当成当前 CSS Grid 自动密排的简单替换。
- 当前 `RibbonDocument` 必须继续作为领域标准数据模型，不能直接把 Puck 内部数据当最终业务格式。
- 迁移应该是“Puck 外壳 + Ribbon 领域内核 + RGL 子组槽位”，而不是一次性推倒重写。

## 3. 目标编辑器结构

迁移后界面建议保持：

```text
顶部：ArcGIS Pro 风格页签栏和工具按钮

主体：
  左侧：Ribbon 画布
    Tab
      Group
        Subgroup：6列 x 3行槽位
          Control：按 w/h 占格

  右侧：组件库 + 属性面板
    组件库按分组展示
    属性面板编辑当前选中对象

底部或抽屉：
  JSON 预览 / 导入 / 导出 / DAML 预览
```

如果 Puck 默认 UI 过重，应使用它的底层能力和 overrides，把界面改成更像 ArcGIS Pro 的工作台，而不是直接套 Puck 默认页面编辑器外观。

## 4. 控件尺寸映射

统一使用最小按钮槽位：

```text
1格 = 32px x 32px
每个 Subgroup = 6列 x 3行
```

建议映射：

| Ribbon 控件 | 小 | 中 | 大 |
| --- | --- | --- | --- |
| Button | `1x1` | `2x1` | `2x3` |
| Tool | `1x1` | `2x1` | `2x3` |
| SplitButton | 不建议 | `2x1` | `2x2` |
| ToolPalette | 不建议 | `3x1` | `3x3` |
| Menu | `1x1` | `2x1` | `2x2` |
| Gallery | 不建议 | `3x1` | `3x3` |
| ComboBox | 不建议 | `3x1` | `4x1` |
| EditBox | 不建议 | `3x1` | `4x1` |
| CheckBox | `1x1` | `2x1` | 不建议 |

在 `react-grid-layout` 中，每个控件对应：

```ts
{
  i: control.id,
  x: control.layout.x,
  y: control.layout.y,
  w: footprint.cols,
  h: footprint.rows,
  minW: footprint.cols,
  maxW: footprint.cols,
  minH: footprint.rows,
  maxH: footprint.rows,
  isResizable: false
}
```

RGL 布局策略：

```tsx
<ReactGridLayout
  layout={layout}
  width={6 * 32}
  gridConfig={{
    cols: 6,
    rowHeight: 32,
    margin: [0, 0],
    containerPadding: [0, 0],
    maxRows: 3
  }}
  dragConfig={{
    enabled: true,
    bounded: true,
    threshold: 5
  }}
  resizeConfig={{
    enabled: false
  }}
  compactor={fixedSlotCompactor}
/>
```

落点必须二次校验：

```ts
x >= 0
y >= 0
x + w <= 6
y + h <= 3
没有与其他控件碰撞
```

不要默认启用自动 compaction。Ribbon 设计器里用户会期待“我放在哪里，就保持在哪里”。如果需要自动整理，应做成单独按钮，而不是拖动时自动挤压其他控件。

## 5. 数据模型调整

当前 JSON 可以继续作为业务导出格式，但需要增加布局坐标：

```ts
interface RibbonControl {
  id: string;
  type: RibbonControlType;
  caption: string;
  size: "small" | "middle" | "large";
  tooltip: string;
  condition: string;
  icon: {
    small: string;
    large: string;
  };
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  behavior: ControlBehavior;
  eventBindings: EventBinding[];
  aiNotes: string;
}
```

Puck 内部数据不建议直接作为最终导出格式。建议增加转换层：

```text
PuckData <-> RibbonDocument
RibbonDocument -> DAML/XML
RibbonDocument -> AI JSON
```

这样后续即使换编辑器底座，业务 JSON 也不会被 Puck 的内部结构绑死。

### 5.1 PuckData 与 RibbonDocument 的边界

Puck 的内部数据适合保存编辑器树，但不适合直接作为 Add-in 配置源。迁移后应明确两层：

```text
编辑器层：PuckData
  用于 Puck 渲染、选择、属性编辑、组件拖拽。

领域层：RibbonDocument
  用于业务保存、JSON 导入导出、DAML/XML 生成、AI 后续补全。
```

需要新增适配器：

```ts
function ribbonDocumentToPuckData(document: RibbonDocument): PuckData;
function puckDataToRibbonDocument(data: PuckData): RibbonDocument;
function legacyRibbonDocumentToLayout(document: RibbonDocument): RibbonDocument;
```

旧 JSON 如果没有 `layout`，导入时使用当前的横向优先 packing 逻辑生成初始 `x/y`。这样能兼容当前已导出的 `schemaVersion: "1.0"` 数据。

## 6. 当前项目可复用资产

建议保留：

| 当前文件/能力 | 迁移结论 |
| --- | --- |
| `src/types.ts` | 直接迁移为领域类型 |
| `src/library.ts` | 直接迁移为 Ribbon 控件库 |
| `src/ribbon.ts` | 拆分为模板、选择器、导入校验、尺寸策略 |
| `resolveRenderedSize` | 保留为 Ribbon 收缩规则基础 |
| `getGridFootprintDimensions` | 抽到 `ribbon-layout/footprint.ts` |
| `packGridFootprints` | 改造成旧 JSON 自动布局和“自动整理”能力 |
| `ControlMock` | 拆成独立控件视觉组件 |
| 中文文案 | 保留，迁移到 `i18n/zhCN.ts` 或常量文件 |
| JSON schema | 保留 `app`、`schemaVersion`、核心数组结构 |
| Playwright smoke 测试 | 保留测试目标，更新选择器和拖拽路径 |

建议重写：

- `src/App.tsx` 中大部分手写编辑器壳。
- `dnd-kit` 直接拖拽逻辑。
- 当前 CSS Grid 顺序流画布。
- 当前右侧属性面板，改为 Puck fields 或自定义 inspector。

建议替换：

- `DndContext`、`SortableContext`、`useSortable`、`closestCenter`、`verticalListSortingStrategy`。
- `.subgroup-command-list` 的 CSS Grid 自动流。
- `.ribbon-command.size-*` 的 `grid-column/grid-row` 定位职责。

可以少量保留 dnd-kit 的场景：

- 右侧结构树拖拽排序。
- 非画布区域的轻量排序。

画布槽位本身不要混用 dnd-kit 和 react-grid-layout 两套拖拽系统。

建议新增：

```text
src/ribbon-designer/
  RibbonWorkbench.tsx
  RibbonCanvas.tsx
  RibbonTabView.tsx
  RibbonGroupView.tsx
  RibbonSubgroupGrid.tsx
  RibbonControlView.tsx

src/puck/
  puckConfig.tsx
  puckFields.ts
  puckAdapters.ts

src/layout/
  footprint.ts
  gridRules.ts
  layoutValidation.ts

src/export/
  ribbonJson.ts
  damlDraft.ts
```

## 7. 子代理执行规划

本轮已经安排并完成 3 个只读子代理调研：

| 子代理 | 调研主题 | 结论 |
| --- | --- | --- |
| A | Puck 迁移验证 | Puck 适合做编辑器底座，但 Ribbon 层级、容量、收缩、DAML 生成必须自定义 |
| B | react-grid-layout 槽位验证 | RGL 适合做显式 `{x,y,w,h}` 槽位引擎，不能继续用顺序流假装真实落点 |
| C | 当前项目资产盘点 | 类型、控件库、模板、JSON schema、ControlMock、测试目标都可迁移 |

后续真正执行迁移时，再按下面 4 个子代理分工运行。

### 子代理 A：Puck 迁移验证

目标：

- 验证 Puck 是否适合承载 `Tab / Group / Subgroup / Control`。
- 搭一个最小 Puck demo。
- 注册 `RibbonGroup`、`RibbonSubgroup`、`RibbonButton` 三类组件。
- 验证中文字段、默认属性、分类展示、JSON 保存。

产出：

- `docs/agent-a-puck-spike.md`
- 可运行 demo 或代码补丁。
- 结论：Puck 默认 UI 是否保留，还是只使用部分能力。

验收：

- 能从组件面板放入 Ribbon 组件。
- 能编辑中文属性。
- 能导出 JSON。

### 子代理 B：react-grid-layout 子组槽位验证

目标：

- 搭建一个独立 `SubgroupGrid`。
- 固定 `cols=6`、`maxRows=3`、`rowHeight=32`。
- 控件按 `w/h` 占格。
- 验证外部拖入、碰撞、越界、删除、移动。

产出：

- `docs/agent-b-grid-spike.md`
- `RibbonSubgroupGrid` 原型。
- 控件尺寸映射函数。

验收：

- 大按钮占 `2x3`。
- 输入框占 `4x1`。
- 超过 6列 x 3行时不能放入。
- 拖动时有占位预览。

### 子代理 C：当前项目资产迁移盘点

目标：

- 盘点当前可复用代码。
- 梳理 `RibbonDocument` 到 PuckData 的适配方式。
- 明确哪些文件保留、哪些文件替换。

产出：

- `docs/agent-c-migration-inventory.md`
- 迁移清单。
- 风险清单。

验收：

- 每个现有模块都有“保留 / 改造 / 删除 / 替换”结论。
- 给出第一批可迁移代码路径。

### 子代理 D：视觉还原与 Playwright 对比

目标：

- 建立 ArcGIS Pro Ribbon 视觉基准。
- 用截图检查画布是否接近 ArcGIS Pro 功能区。
- 建立 Playwright 截图回归。

产出：

- `docs/agent-d-visual-baseline.md`
- 截图对比方法。
- 关键 CSS 规则。

验收：

- 至少覆盖默认模板、拖入控件、紧凑模式三张截图。
- 文案、控件比例、网格边界可读。

## 8. 执行批次

### 第 0 批：冻结当前原型

- 保留当前项目作为 `legacy-dnd-kit-prototype`。
- README 记录当前能力。
- 截图留档。
- 不再继续在当前 `App.tsx` 里堆新的大型功能。

### 第 1 批：技术 Spike

- 子代理 A 做 Puck demo。
- 子代理 B 做 react-grid-layout demo。
- 子代理 C 做迁移盘点。
- 子代理 D 做视觉基准。
- 先验证最小闭环，不做完整产品外观。

当前进度：

- 已安装 `@puckeditor/core@0.21.2` 和 `react-grid-layout@2.2.3`。
- 已新增默认入口 `src/next/NextRibbonDesigner.tsx`。
- 已新增 RGL 槽位规则 `src/next/ribbonLayout.ts`。
- 已新增 Puck 组件配置适配 `src/next/puckConfig.tsx`。
- 已新增迁移版控件视觉 `src/next/ControlMock.tsx`。
- 默认 `/` 打开迁移版，旧版保留在 `?legacy=1`。
- Playwright smoke 已覆盖拖入大按钮、`64px x 96px`、属性编辑、JSON `layout`、导出 JSON。

### 第 2 批：建立新架构

- 引入 Puck。
- 引入 react-grid-layout。
- 新建 `RibbonWorkbench`。
- 保留当前 `RibbonDocument` 作为唯一业务模型。
- 先抽出 `ribbon-layout.ts`、`ribbon-adapter.ts`、`puck.config.tsx` 三层。

### 第 3 批：迁移核心功能

- 迁移控件库。
- 迁移模板。
- 迁移 JSON 导入导出。
- 迁移控件 mock。
- 替换子组画布为 `RibbonSubgroupGrid`。
- 新增 `layout.x/y/w/h`，旧 JSON 导入时自动补布局。

### 第 4 批：补齐产品体验

- 中文属性面板。
- 删除、复制、重命名。
- 预览模式。
- 错误提示。
- Playwright 截图回归。
- 增加碰撞、越界、跨子组移动、旧 JSON 兼容测试。

### 第 5 批：面向 Add-in 生产

- DAML 草稿导出。
- C# command 类占位生成。
- 事件绑定配置。
- 条件表达式配置。
- 模板库。

## 9. 风险与规避

| 风险 | 影响 | 规避 |
| --- | --- | --- |
| Puck 默认页面编辑器思路太强 | 画布不像 ArcGIS Pro | 只用组件注册和数据能力，工作台 UI 自定义 |
| Puck JSON 与业务 JSON 耦合 | 后续 DAML 难生成 | 增加 `PuckData <-> RibbonDocument` 转换层 |
| react-grid-layout 外部拖入不符合预期 | 组件库拖入体验差 | 先做独立 Spike，再集成 |
| 子组内自动排布不符合 Pro | 收缩和布局不真实 | 默认禁用自动 compaction，必要时做单独“自动整理” |
| dnd-kit 与 RGL 双拖拽冲突 | 拖拽事件不稳定 | 画布槽位只用 RGL，dnd-kit 最多保留给结构树 |
| Puck DropZone 方案过时 | 后续升级成本高 | 新结构优先使用 slot，不基于旧 DropZone 设计 |
| 旧 JSON 没有 layout | 导入后无法精确还原 | 导入时自动 pack，导出后补齐 `layout` |
| 视觉仍不像 Pro | 用户不可接受 | 建立 Playwright 截图基准，每轮对比 |

## 10. 推荐结论

建议停止在当前手写 `dnd-kit` 原型上继续堆功能，转为：

```text
Puck 做编辑器底座
react-grid-layout 做 Subgroup 槽位引擎
当前 RibbonDocument 继续做业务数据模型
当前控件库和中文文案迁移复用
```

这条路线比从零做编辑器更快，也比直接套通用 Web Builder 更贴近 ArcGIS Pro Add-in 的强约束布局。

## 11. 参考来源

- Puck 文档：https://puckeditor.com/docs
- Puck ComponentConfig：https://puckeditor.com/docs/api-reference/configuration/component-config
- react-grid-layout：https://github.com/react-grid-layout/react-grid-layout
