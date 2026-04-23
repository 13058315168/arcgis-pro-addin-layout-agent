# ArcGIS Pro Add-in Ribbon 布局设计器原型

这是一个用于设计 ArcGIS Pro Add-in 功能区的前端原型。当前目标不是直接生成 `Config.daml`，而是先把 Ribbon 控件类型、真实尺寸比例、分组网格、拖拽吸附、JSON 导入导出和本地保存做好，方便后续继续补命令事件、条件表达式和 DAML/XML 转换。

## 当前目标

- 做一个视觉和交互都接近 ArcGIS Pro 功能区的 Ribbon 画布。
- 主界面采用“上方画布 + 右侧控件库/属性/JSON”的结构，控件库距离画布尽量近。
- 只把 `Group` 作为用户可见的布局单位，不再让用户面对很多 `Subgroup`。
- 每个分组内部是可扩展网格，可以按需要加行、减行、扩列、减列。
- 以最小按钮空间作为 `1x1` 单位，其他控件按整数格占位，类似俄罗斯方块。
- 拖入和移动控件时按格吸附，不允许越界或与已有控件重叠。
- 导出的 JSON 保持 AI 友好，后续可继续补行为、事件和生成 DAML。

## 界面结构

- 顶部模拟 ArcGIS Pro 窗口标题、功能区页签和工具条。
- 中间左侧是 Ribbon 画布，按 `Tab -> Group -> Control` 的方式展示。
- 每个分组顶部有分组名、列数、行数控制。
- 每个分组内部显示列号、已用长度、总长度和网格线。
- 右侧上半部分是控件库，按“命令控件 / 输入与选择”分组。
- 右侧下半部分是属性与 JSON，选中控件后可以编辑标题、尺寸、提示、条件和 AI 备注。

## 控件尺寸规则

当前以 `1格 = 32px x 32px` 建模：

| 控件类型 | 小 | 中 | 大 |
| --- | --- | --- | --- |
| Button 按钮 | `1x1` | `2x1` | `2x3` |
| Tool 交互工具 | `1x1` | `2x1` | `2x3` |
| SplitButton 分裂按钮 | - | `2x1` | `2x2` |
| ToolPalette 工具板 | - | `3x1` | `3x3` |
| Menu 菜单 | `1x1` | `2x1` | `2x2` |
| Gallery 画廊 | - | `3x1` | `3x3` |
| ComboBox 下拉框 | - | `3x1` | `4x1` |
| EditBox 输入框 | - | `3x1` | `4x1` |
| CheckBox 复选框 | `1x1` | `2x1` | - |

## 已实现功能

- 中文控件库和中文界面文案。
- Add-In 工具箱、地图风格、空白 Ribbon 三个模板。
- 右侧控件库拖放到画布分组。
- 画布控件拖动重排，并按网格吸附。
- 分组可动态扩列、减列、加行、减行。
- 分组显示长度限制，例如 `已用到 10/10 列 · 4 行`。
- 非法放置会即时提示，例如越界、空间不足或目标格位已有控件。
- 属性编辑与 JSON 实时同步。
- JSON 复制、导出、导入。
- 浏览器本地存储自动保存。
- Playwright 主流程测试和截图验收。

## 数据模型

导出 JSON 仍保留后续生成 DAML 所需的结构：

```json
{
  "metadata": {
    "app": "gispro-ribbon-designer",
    "schemaVersion": "1.0"
  },
  "tabs": [],
  "groups": [],
  "subgroups": [],
  "controls": []
}
```

说明：

- `subgroups` 目前作为内部兼容层保留，每个 `Group` 只有一个内部网格。
- 用户界面不再暴露多个子组。
- `control.layout` 保存真实网格位置：`x / y / w / h`。
- `control.behavior` 和 `eventBindings` 先作为后续命令事件扩展入口。

## 运行方式

安装依赖：

```powershell
npm install
```

启动开发服务：

```powershell
npm run dev -- --host 127.0.0.1 --port 4173
```

浏览器打开：

```text
http://127.0.0.1:4173/
```

## 验证命令

构建：

```powershell
npm run build
```

Playwright 主流程测试：

```powershell
npm run test:smoke
```

测试会验证：

- 页面正常打开。
- Ribbon 画布、控件库和中文文案可见。
- 分组可以加行。
- 从右侧控件库拖入大按钮。
- 大按钮保持 `2x3`，即 `64px x 96px`。
- 修改控件标题后 JSON 同步更新。
- JSON 可以导出。
- 生成截图 `playwright-ribbon-smoke.png`。

## 主要文件

```text
src/next/NextRibbonDesigner.tsx   默认主界面、拖放、分组网格、导入导出
src/next/NextRibbonDesigner.css   ArcGIS Pro 风格界面、网格、控件比例
src/next/ribbonLayout.ts          网格尺寸、碰撞检测、吸附布局
src/next/ControlMock.tsx          Ribbon 控件外观模拟
src/library.ts                    控件库定义
src/ribbon.ts                     模板、导入校验、尺寸收缩规则
src/types.ts                      JSON 数据模型类型
tests/ribbon-smoke.spec.ts        Playwright 主流程测试
```

## 后续建议

- 增加真正的拖入落点阴影和更强的占位预览。
- 增加分组缩放优先级的可视化预览。
- 增加 Tab 新增、重命名和删除。
- 扩展命令事件配置面板。
- 增加 DAML/XML 生成器。
- 后续再纳入 DockPane、ProWindow、EmbeddableControl。
