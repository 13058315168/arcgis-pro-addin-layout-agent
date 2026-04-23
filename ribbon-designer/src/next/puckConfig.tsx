import type { Config, Data } from '@puckeditor/core';

type RibbonPuckComponents = {
  RibbonButton: {
    caption: string;
    size: 'small' | 'middle' | 'large';
    tooltip: string;
  };
  RibbonEditBox: {
    caption: string;
    size: 'middle' | 'large';
    tooltip: string;
  };
  RibbonGallery: {
    caption: string;
    size: 'middle' | 'large';
    tooltip: string;
  };
};

export const ribbonPuckConfig: Config<RibbonPuckComponents> = {
  components: {
    RibbonButton: {
      label: '按钮',
      fields: {
        caption: { type: 'text', label: '标题' },
        size: {
          type: 'select',
          label: '尺寸',
          options: [
            { label: '小 1x1', value: 'small' },
            { label: '中 2x1', value: 'middle' },
            { label: '大 2x3', value: 'large' },
          ],
        },
        tooltip: { type: 'textarea', label: '提示' },
      },
      defaultProps: {
        caption: '导出',
        size: 'large',
        tooltip: '执行一次性命令',
      },
      render: ({ caption, size }) => (
        <div data-puck-ribbon-control="button">
          {caption} · {size}
        </div>
      ),
    },
    RibbonEditBox: {
      label: '输入框',
      fields: {
        caption: { type: 'text', label: '默认值' },
        size: {
          type: 'select',
          label: '尺寸',
          options: [
            { label: '中 3x1', value: 'middle' },
            { label: '大 4x1', value: 'large' },
          ],
        },
        tooltip: { type: 'textarea', label: '提示' },
      },
      defaultProps: {
        caption: 'C:\\Data\\Project.gdb',
        size: 'large',
        tooltip: '输入路径或参数',
      },
      render: ({ caption, size }) => (
        <div data-puck-ribbon-control="editBox">
          {caption} · {size}
        </div>
      ),
    },
    RibbonGallery: {
      label: '画廊',
      fields: {
        caption: { type: 'text', label: '标题' },
        size: {
          type: 'select',
          label: '尺寸',
          options: [
            { label: '中 3x1', value: 'middle' },
            { label: '大 3x3', value: 'large' },
          ],
        },
        tooltip: { type: 'textarea', label: '提示' },
      },
      defaultProps: {
        caption: '填充样式',
        size: 'large',
        tooltip: '以图块方式选择样式',
      },
      render: ({ caption, size }) => (
        <div data-puck-ribbon-control="gallery">
          {caption} · {size}
        </div>
      ),
    },
  },
};

export const initialRibbonPuckData: Data = {
  root: {},
  content: [],
};
