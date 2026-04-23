import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import ReactGridLayout, { getCompactor, type Layout, type LayoutItem } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import {
  Copy,
  Download,
  FileJson,
  FolderInput,
  LayoutGrid,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { CONTROL_LIBRARY, SIZE_LABELS } from '../library';
import {
  cloneDocumentWithTimestamp,
  createAddInTemplate,
  createControlFromType,
  createEmptyDocument,
  createId,
  createMapTemplate,
  parseImportedDocument,
} from '../ribbon';
import type {
  LibraryControlDefinition,
  RibbonControl,
  RibbonControlSize,
  RibbonDocument,
  RibbonGroup,
  RibbonPreviewMode,
  RibbonSubgroup,
} from '../types';
import { ControlMock } from './ControlMock';
import { ribbonPuckConfig } from './puckConfig';
import {
  DEFAULT_GROUP_COLS,
  DEFAULT_GROUP_ROWS,
  MAX_GROUP_COLS,
  MAX_GROUP_ROWS,
  MIN_GROUP_COLS,
  MIN_GROUP_ROWS,
  RIBBON_CELL,
  canPlaceRect,
  footprintLabel,
  getFootprint,
  getGridSpec,
  getRenderedSize,
  getSubgroupControls,
  getSubgroupLayout,
  normalizeDocumentLayouts,
} from './ribbonLayout';
import './NextRibbonDesigner.css';

const STORAGE_KEY = 'gispro-ribbon-designer-next-doc';
const fixedSlotCompactor = getCompactor(null, false, true);

const previewLabels: Record<RibbonPreviewMode, string> = {
  Large: '宽屏',
  Medium: '标准',
  Small: '紧凑',
  Collapsed: '折叠',
};

const templateFactories = {
  blank: createEmptyDocument,
  addin: createAddInTemplate,
  map: createMapTemplate,
};

const templateLabels = {
  blank: '空白 Ribbon',
  addin: 'Add-In 工具箱',
  map: '地图风格',
};

const librarySections = [
  {
    title: '命令控件',
    items: CONTROL_LIBRARY.filter((item) =>
      ['button', 'tool', 'splitButton', 'toolPalette', 'menu', 'gallery'].includes(item.type),
    ),
  },
  {
    title: '输入与选择',
    items: CONTROL_LIBRARY.filter((item) => ['comboBox', 'editBox', 'checkBox'].includes(item.type)),
  },
];

const createInitialDocument = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = parseImportedDocument(saved);
    if (parsed) return ensureSingleGridPerGroup(parsed);
    localStorage.removeItem(STORAGE_KEY);
  }
  return ensureSingleGridPerGroup(createAddInTemplate());
};

const downloadJson = (document: RibbonDocument) => {
  const blob = new Blob([JSON.stringify(document, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = globalThis.document.createElement('a');
  link.href = url;
  link.download = `${document.metadata.name || 'ribbon-layout'}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

const ensureSingleGridPerGroup = (source: RibbonDocument): RibbonDocument => {
  let controls = source.controls;
  const subgroupsById = new Map(source.subgroups.map((subgroup) => [subgroup.id, subgroup]));
  const nextSubgroups: RibbonSubgroup[] = [];

  const groups = source.groups.map((group) => {
    const primaryId = group.subgroupIds[0] ?? createId('subgroup');
    const allControlIds = group.subgroupIds.flatMap(
      (subgroupId) => subgroupsById.get(subgroupId)?.controlIds ?? [],
    );
    controls = controls.map((control) =>
      allControlIds.includes(control.id) ? { ...control, subgroupId: primaryId } : control,
    );
    const existing = subgroupsById.get(primaryId);
    nextSubgroups.push({
      id: primaryId,
      groupId: group.id,
      caption: '分组网格',
      sizeMode: existing?.sizeMode ?? 'Default',
      verticalAlignment: existing?.verticalAlignment ?? 'Top',
      layout: {
        row: 0,
        columns: existing?.layout?.columns ?? DEFAULT_GROUP_COLS,
        rows: existing?.layout?.rows ?? DEFAULT_GROUP_ROWS,
      },
      controlIds: allControlIds,
    });
    return { ...group, subgroupIds: [primaryId] };
  });

  return normalizeDocumentLayouts({ ...source, groups, subgroups: nextSubgroups, controls });
};

export default function NextRibbonDesigner() {
  const [document, setDocument] = useState<RibbonDocument>(() => createInitialDocument());
  const [previewMode, setPreviewMode] = useState<RibbonPreviewMode>('Large');
  const [activeTabId, setActiveTabId] = useState(document.tabs[0]?.id ?? '');
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null);
  const [activeLibraryItem, setActiveLibraryItem] = useState<{
    item: LibraryControlDefinition;
    size: RibbonControlSize;
  } | null>(null);
  const [toast, setToast] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(document));
  }, [document]);

  const activeTab = document.tabs.find((tab) => tab.id === activeTabId) ?? document.tabs[0];
  const activeGroups = useMemo(
    () =>
      activeTab
        ? (activeTab.groupIds
            .map((groupId) => document.groups.find((group) => group.id === groupId))
            .filter(Boolean) as RibbonGroup[])
        : [],
    [activeTab, document.groups],
  );
  const selectedControl = document.controls.find((control) => control.id === selectedControlId) ?? null;
  const json = useMemo(() => JSON.stringify(document, null, 2), [document]);

  const commit = (recipe: (current: RibbonDocument) => RibbonDocument) => {
    setDocument((current) => ensureSingleGridPerGroup(cloneDocumentWithTimestamp(recipe(current))));
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2200);
  };

  const loadTemplate = (key: keyof typeof templateFactories) => {
    const next = ensureSingleGridPerGroup(templateFactories[key]());
    setDocument(next);
    setActiveTabId(next.tabs[0]?.id ?? '');
    setSelectedControlId(null);
    showToast(`已载入：${templateLabels[key]}`);
  };

  const addGroup = () => {
    if (!activeTab) return;
    const groupId = createId('group');
    const subgroupId = createId('subgroup');
    const group: RibbonGroup = {
      id: groupId,
      tabId: activeTab.id,
      caption: `新分组 ${document.groups.length + 1}`,
      keytip: `G${document.groups.length + 1}`,
      launcherButton: false,
      sizePriorities: [30, 80, 120],
      subgroupIds: [subgroupId],
    };
    const subgroup: RibbonSubgroup = {
      id: subgroupId,
      groupId,
      caption: '分组网格',
      sizeMode: 'Default',
      verticalAlignment: 'Top',
      layout: { row: 0, columns: DEFAULT_GROUP_COLS, rows: DEFAULT_GROUP_ROWS },
      controlIds: [],
    };
    commit((current) => ({
      ...current,
      tabs: current.tabs.map((tab) =>
        tab.id === activeTab.id ? { ...tab, groupIds: [...tab.groupIds, groupId] } : tab,
      ),
      groups: [...current.groups, group],
      subgroups: [...current.subgroups, subgroup],
    }));
  };

  const updateGroup = (groupId: string, patch: Partial<RibbonGroup>) => {
    commit((current) => ({
      ...current,
      groups: current.groups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)),
    }));
  };

  const updateGroupGrid = (groupId: string, patch: Partial<RibbonSubgroup['layout']>) => {
    commit((current) => ({
      ...current,
      subgroups: current.subgroups.map((subgroup) =>
        subgroup.groupId === groupId
          ? {
              ...subgroup,
              layout: {
                row: 0,
                columns: DEFAULT_GROUP_COLS,
                rows: DEFAULT_GROUP_ROWS,
                ...subgroup.layout,
                ...patch,
              },
            }
          : subgroup,
      ),
    }));
  };

  const updateControl = (controlId: string, patch: Partial<RibbonControl>) => {
    commit((current) => ({
      ...current,
      controls: current.controls.map((control) =>
        control.id === controlId ? { ...control, ...patch } : control,
      ),
    }));
  };

  const deleteControl = (controlId: string) => {
    commit((current) => {
      const control = current.controls.find((item) => item.id === controlId);
      if (!control) return current;
      return {
        ...current,
        controls: current.controls.filter((item) => item.id !== controlId),
        subgroups: current.subgroups.map((subgroup) =>
          subgroup.id === control.subgroupId
            ? { ...subgroup, controlIds: subgroup.controlIds.filter((id) => id !== controlId) }
            : subgroup,
        ),
      };
    });
    setSelectedControlId(null);
  };

  const addControlAt = (
    subgroup: RibbonSubgroup,
    definition: LibraryControlDefinition,
    size: RibbonControlSize,
    layout: { x: number; y: number; w: number; h: number },
  ) => {
    const nextControl = createControlFromType(definition.type, subgroup.id, { size, layout });
    commit((current) => ({
      ...current,
      controls: [...current.controls, nextControl],
      subgroups: current.subgroups.map((item) =>
        item.id === subgroup.id ? { ...item, controlIds: [...item.controlIds, nextControl.id] } : item,
      ),
    }));
    setSelectedControlId(nextControl.id);
    showToast(`已加入 ${definition.label}`);
  };

  const updateSubgroupLayout = (_subgroupId: string, layout: Layout) => {
    const byId = new Map(layout.map((item) => [item.i, item]));
    commit((current) => ({
      ...current,
      controls: current.controls.map((control) => {
        const item = byId.get(control.id);
        return item ? { ...control, layout: { x: item.x, y: item.y, w: item.w, h: item.h } } : control;
      }),
    }));
  };

  const importJson = () => {
    const parsed = parseImportedDocument(importText);
    if (!parsed) {
      showToast('导入失败：JSON 结构不符合当前 schema');
      return;
    }
    const next = ensureSingleGridPerGroup(parsed);
    setDocument(next);
    setActiveTabId(next.tabs[0]?.id ?? '');
    setSelectedControlId(null);
    setImportOpen(false);
    showToast('已导入 JSON');
  };

  return (
    <div className="next-shell">
      <header className="next-titlebar">
        <div className="window-handle">ArcGIS Pro</div>
        <div className="window-title">Add-In Ribbon 布局设计器</div>
        <div className="window-buttons">
          <span />
          <span />
          <span />
        </div>
      </header>

      <section className="next-pro-tabs">
        {['工程', '地图', '插入', '分析', '视图', '编辑', '影像', '共享'].map((label) => (
          <button key={label}>{label}</button>
        ))}
        {document.tabs.map((tab) => (
          <button
            key={tab.id}
            className={tab.id === activeTab?.id ? 'active' : ''}
            onClick={() => setActiveTabId(tab.id)}
          >
            {tab.caption}
          </button>
        ))}
      </section>

      <section className="next-toolbar">
        <div className="next-toolbar-left">
          <button onClick={addGroup}>
            <Plus size={14} />
            新增分组
          </button>
          {(Object.keys(templateFactories) as Array<keyof typeof templateFactories>).map((key) => (
            <button key={key} onClick={() => loadTemplate(key)}>
              {templateLabels[key]}
            </button>
          ))}
        </div>
        <div className="next-toolbar-right">
          {(['Large', 'Medium', 'Small', 'Collapsed'] as RibbonPreviewMode[]).map((mode) => (
            <button
              key={mode}
              className={mode === previewMode ? 'active' : ''}
              onClick={() => setPreviewMode(mode)}
            >
              {previewLabels[mode]}
            </button>
          ))}
          <button onClick={() => loadTemplate('addin')}>
            <RotateCcw size={14} />
            重置
          </button>
          <button
            onClick={() =>
              navigator.clipboard
                ?.writeText(json)
                .then(() => showToast('JSON 已复制'))
                .catch(() => showToast('当前环境不支持剪贴板'))
            }
          >
            <Copy size={14} />
            复制 JSON
          </button>
          <button onClick={() => setImportOpen(true)}>
            <Upload size={14} />
            导入
          </button>
          <button className="primary" onClick={() => downloadJson(document)}>
            <Download size={14} />
            导出 JSON
          </button>
        </div>
      </section>

      <main className="next-workbench">
        <section className="next-canvas">
          <div className="next-canvas-title">
            <strong>Ribbon 画布</strong>
            <span>1格=最小按钮空间；控件按真实占格吸附，分组可扩列、加行。</span>
          </div>
          <div className="next-ribbon-area">
            {previewMode === 'Collapsed' ? (
              activeGroups.map((group) => (
                <section className="next-group collapsed" key={group.id}>
                  <div className="collapsed-tile">组</div>
                  <div className="next-group-caption">{group.caption}</div>
                </section>
              ))
            ) : activeGroups.length ? (
              activeGroups.map((group) => (
                <RibbonGroupView
                  key={group.id}
                  document={document}
                  group={group}
                  previewMode={previewMode}
                  selectedControlId={selectedControlId}
                  activeLibraryItem={activeLibraryItem}
                  onUpdateGroup={updateGroup}
                  onUpdateGrid={updateGroupGrid}
                  onAddControl={addControlAt}
                  onLayoutChange={updateSubgroupLayout}
                  onSelectControl={setSelectedControlId}
                  onToast={showToast}
                />
              ))
            ) : (
              <div className="next-empty-canvas">先新增一个分组，再从右侧拖入控件。</div>
            )}
          </div>
        </section>

        <aside className="next-side">
          <Palette
            activeLibraryItem={activeLibraryItem}
            onPick={setActiveLibraryItem}
            onDragEnd={() => setActiveLibraryItem(null)}
          />
          <Inspector control={selectedControl} json={json} onUpdate={updateControl} onDelete={deleteControl} />
        </aside>
      </main>

      {importOpen ? (
        <div className="next-modal" onClick={() => setImportOpen(false)}>
          <div className="next-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="next-modal-head">
              <strong>导入 Ribbon JSON</strong>
              <button onClick={() => setImportOpen(false)}>关闭</button>
            </div>
            <textarea
              value={importText}
              rows={18}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="粘贴导出的 JSON，或先点“载入当前 JSON”再修改。"
            />
            <div className="next-modal-actions">
              <button onClick={() => setImportText(json)}>
                <FolderInput size={14} />
                载入当前 JSON
              </button>
              <button className="primary" onClick={importJson}>
                应用导入
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className="next-toast">{toast}</div> : null}
    </div>
  );
}

function RibbonGroupView({
  document,
  group,
  previewMode,
  selectedControlId,
  activeLibraryItem,
  onUpdateGroup,
  onUpdateGrid,
  onAddControl,
  onLayoutChange,
  onSelectControl,
  onToast,
}: {
  document: RibbonDocument;
  group: RibbonGroup;
  previewMode: RibbonPreviewMode;
  selectedControlId: string | null;
  activeLibraryItem: { item: LibraryControlDefinition; size: RibbonControlSize } | null;
  onUpdateGroup: (groupId: string, patch: Partial<RibbonGroup>) => void;
  onUpdateGrid: (groupId: string, patch: Partial<RibbonSubgroup['layout']>) => void;
  onAddControl: (
    subgroup: RibbonSubgroup,
    definition: LibraryControlDefinition,
    size: RibbonControlSize,
    layout: { x: number; y: number; w: number; h: number },
  ) => void;
  onLayoutChange: (subgroupId: string, layout: Layout) => void;
  onSelectControl: (controlId: string) => void;
  onToast: (message: string) => void;
}) {
  const subgroup = document.subgroups.find((item) => item.id === group.subgroupIds[0]);
  if (!subgroup) return null;
  const spec = getGridSpec(subgroup);

  return (
    <section className="next-group">
      <div className="next-group-tools">
        <label>
          分组名
          <input value={group.caption} onChange={(event) => onUpdateGroup(group.id, { caption: event.target.value })} />
        </label>
        <button onClick={() => onUpdateGrid(group.id, { columns: Math.max(MIN_GROUP_COLS, spec.cols - 1) })}>
          -列
        </button>
        <strong>{spec.cols}列</strong>
        <button onClick={() => onUpdateGrid(group.id, { columns: Math.min(MAX_GROUP_COLS, spec.cols + 1) })}>
          +列
        </button>
        <button onClick={() => onUpdateGrid(group.id, { rows: Math.max(MIN_GROUP_ROWS, spec.rows - 1) })}>
          -行
        </button>
        <strong>{spec.rows}行</strong>
        <button onClick={() => onUpdateGrid(group.id, { rows: Math.min(MAX_GROUP_ROWS, spec.rows + 1) })}>
          +行
        </button>
      </div>
      <RibbonGroupGrid
        document={document}
        subgroup={subgroup}
        previewMode={previewMode}
        selectedControlId={selectedControlId}
        activeLibraryItem={activeLibraryItem}
        onAddControl={onAddControl}
        onLayoutChange={onLayoutChange}
        onSelectControl={onSelectControl}
        onToast={onToast}
      />
      <div className="next-group-caption">{group.caption}</div>
    </section>
  );
}

function RibbonGroupGrid({
  document,
  subgroup,
  previewMode,
  selectedControlId,
  activeLibraryItem,
  onAddControl,
  onLayoutChange,
  onSelectControl,
  onToast,
}: {
  document: RibbonDocument;
  subgroup: RibbonSubgroup;
  previewMode: RibbonPreviewMode;
  selectedControlId: string | null;
  activeLibraryItem: { item: LibraryControlDefinition; size: RibbonControlSize } | null;
  onAddControl: (
    subgroup: RibbonSubgroup,
    definition: LibraryControlDefinition,
    size: RibbonControlSize,
    layout: { x: number; y: number; w: number; h: number },
  ) => void;
  onLayoutChange: (subgroupId: string, layout: Layout) => void;
  onSelectControl: (controlId: string) => void;
  onToast: (message: string) => void;
}) {
  const [preview, setPreview] = useState<LayoutItem | null>(null);
  const controls = getSubgroupControls(document, subgroup);
  const spec = getGridSpec(subgroup);
  const layout = getSubgroupLayout(document, subgroup, previewMode).map((item) => ({
    ...item,
    minW: item.w,
    maxW: item.w,
    minH: item.h,
    maxH: item.h,
    isResizable: false,
    isBounded: true,
  }));
  const usedColumns = layout.reduce((max, item) => Math.max(max, item.x + item.w), 0);

  const computeDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!activeLibraryItem) return null;
    const rect = event.currentTarget.getBoundingClientRect();
    const footprint = getFootprint(activeLibraryItem.item.type, activeLibraryItem.size);
    const x = Math.max(0, Math.min(spec.cols - footprint.w, Math.floor((event.clientX - rect.left) / RIBBON_CELL)));
    const y = Math.max(0, Math.min(spec.rows - footprint.h, Math.floor((event.clientY - rect.top) / RIBBON_CELL)));
    const candidate = { i: '__preview__', x, y, w: footprint.w, h: footprint.h };
    return { candidate, valid: canPlaceRect(candidate, layout, spec) };
  };

  return (
    <div
      className="next-subgroup"
      style={{ '--group-cols': spec.cols, '--group-rows': spec.rows } as CSSProperties}
    >
      <div className="next-subgroup-head">
        <span>1格=小按钮</span>
        <strong>
          已用到 {usedColumns}/{spec.cols} 列 · {spec.rows} 行
        </strong>
      </div>
      <div className="next-ruler">
        {Array.from({ length: spec.cols }).map((_, index) => (
          <span key={index}>{index + 1}</span>
        ))}
      </div>
      <div
        className="next-grid-board"
        data-testid={`next-drop-${subgroup.id}`}
        onDragOver={(event) => {
          if (!activeLibraryItem) return;
          event.preventDefault();
          const result = computeDrop(event);
          setPreview(result?.candidate ?? null);
        }}
        onDragLeave={() => setPreview(null)}
        onDrop={(event) => {
          event.preventDefault();
          const result = computeDrop(event);
          if (!activeLibraryItem || !result?.valid) {
            onToast(`放不下：当前分组是 ${spec.cols}列 x ${spec.rows}行，可先加行或扩列`);
            setPreview(null);
            return;
          }
          const { x, y, w, h } = result.candidate;
          onAddControl(subgroup, activeLibraryItem.item, activeLibraryItem.size, { x, y, w, h });
          setPreview(null);
        }}
      >
        {preview ? (
          <div
            className={`next-drop-preview ${canPlaceRect(preview, layout, spec) ? 'valid' : 'invalid'}`}
            style={{
              left: preview.x * RIBBON_CELL,
              top: preview.y * RIBBON_CELL,
              width: preview.w * RIBBON_CELL,
              height: preview.h * RIBBON_CELL,
            }}
          />
        ) : null}
        <ReactGridLayout
          className="next-rgl"
          layout={layout}
          width={spec.cols * RIBBON_CELL}
          gridConfig={{
            cols: spec.cols,
            rowHeight: RIBBON_CELL,
            margin: [0, 0],
            containerPadding: [0, 0],
            maxRows: spec.rows,
          }}
          dragConfig={{ enabled: true, bounded: true, threshold: 4 }}
          resizeConfig={{ enabled: false }}
          compactor={fixedSlotCompactor}
          autoSize={false}
          onDragStop={(nextLayout) => {
            const clean = nextLayout.map((item) => ({
              i: item.i,
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h,
            }));
            const valid = clean.every((item) => canPlaceRect(item, clean, spec, item.i));
            if (valid) onLayoutChange(subgroup.id, clean);
            else onToast('目标格位已有控件，已回退');
          }}
        >
          {controls.map((control) => {
            const renderedSize = getRenderedSize(control, subgroup, previewMode);
            return (
              <button
                key={control.id}
                data-testid={`next-control-${control.id}`}
                className={`next-ribbon-control ${control.id === selectedControlId ? 'selected' : ''}`}
                onClick={() => onSelectControl(control.id)}
              >
                <ControlMock type={control.type} caption={control.caption} size={renderedSize} />
              </button>
            );
          })}
        </ReactGridLayout>
      </div>
    </div>
  );
}

function Palette({
  activeLibraryItem,
  onPick,
  onDragEnd,
}: {
  activeLibraryItem: { item: LibraryControlDefinition; size: RibbonControlSize } | null;
  onPick: (value: { item: LibraryControlDefinition; size: RibbonControlSize }) => void;
  onDragEnd: () => void;
}) {
  return (
    <section className="next-panel">
      <div className="next-panel-title">
        <LayoutGrid size={15} />
        <strong>控件库</strong>
      </div>
      {librarySections.map((section) => (
        <div className="next-library-section" key={section.title}>
          <h3>{section.title}</h3>
          {section.items.map((item) => (
            <div className="next-library-row" key={item.type}>
              <div>
                <strong>{item.label}</strong>
                <span>{item.shortDescription}</span>
              </div>
              <div className="next-library-sizes">
                {item.supportedSizes.map((size) => (
                  <button
                    key={`${item.type}-${size}`}
                    draggable
                    data-testid={`next-palette-${item.type}-${size}`}
                    className={activeLibraryItem?.item.type === item.type && activeLibraryItem.size === size ? 'active' : ''}
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', `${item.type}:${size}`);
                      onPick({ item, size });
                    }}
                    onClick={() => onPick({ item, size })}
                    onDragEnd={onDragEnd}
                  >
                    {SIZE_LABELS[size]} {footprintLabel(item.type, size)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

function Inspector({
  control,
  json,
  onUpdate,
  onDelete,
}: {
  control: RibbonControl | null;
  json: string;
  onUpdate: (controlId: string, patch: Partial<RibbonControl>) => void;
  onDelete: (controlId: string) => void;
}) {
  return (
    <section className="next-panel next-inspector">
      <div className="next-panel-title">
        <FileJson size={15} />
        <strong>属性与 JSON</strong>
      </div>
      {control ? (
        <div className="next-form">
          <label>
            标题
            <input value={control.caption} onChange={(event) => onUpdate(control.id, { caption: event.target.value })} />
          </label>
          <label>
            首选尺寸
            <select
              value={control.size}
              onChange={(event) => onUpdate(control.id, { size: event.target.value as RibbonControlSize })}
            >
              {control.supportedSizes.map((size) => (
                <option key={size} value={size}>
                  {SIZE_LABELS[size]} {footprintLabel(control.type, size)}
                </option>
              ))}
            </select>
          </label>
          <label>
            提示
            <input value={control.tooltip} onChange={(event) => onUpdate(control.id, { tooltip: event.target.value })} />
          </label>
          <label>
            条件
            <input
              value={control.condition}
              onChange={(event) => onUpdate(control.id, { condition: event.target.value })}
              placeholder="condition ID"
            />
          </label>
          <label>
            AI 备注
            <textarea rows={3} value={control.aiNotes} onChange={(event) => onUpdate(control.id, { aiNotes: event.target.value })} />
          </label>
          <button className="danger" onClick={() => onDelete(control.id)}>
            <Trash2 size={14} />
            删除控件
          </button>
        </div>
      ) : (
        <p className="next-muted">选中画布中的控件后编辑属性。</p>
      )}

      <div className="next-puck-note">
        <FileJson size={14} />
        <span>Puck 迁移层已接入：{Object.keys(ribbonPuckConfig.components).join(' / ')}</span>
      </div>
      <textarea className="next-json" value={json} readOnly rows={16} />
    </section>
  );
}
