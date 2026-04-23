import {
  Check,
  ChevronDown,
  Circle,
  Diamond,
  Edit3,
  MousePointer2,
  Pentagon,
  Square,
} from 'lucide-react';
import type { RibbonControl, RibbonControlSize } from '../types';

export function ControlMock({
  type,
  caption,
  size,
}: {
  type: RibbonControl['type'];
  caption: string;
  size: RibbonControlSize;
}) {
  const label = size === 'small' && caption.length > 3 ? caption.slice(0, 3) : caption;

  if (type === 'comboBox') {
    return (
      <div className={`next-control-mock next-combo size-${size}`}>
        <span>{label}</span>
        <ChevronDown size={12} />
      </div>
    );
  }

  if (type === 'editBox') {
    return <div className={`next-control-mock next-edit size-${size}`}>{label}</div>;
  }

  if (type === 'checkBox') {
    return (
      <div className={`next-control-mock next-check size-${size}`}>
        <span className="next-check-box">
          <Check size={10} />
        </span>
        {size !== 'small' ? <span>{label}</span> : null}
      </div>
    );
  }

  if (type === 'gallery') {
    return (
      <div className={`next-control-mock next-gallery size-${size}`}>
        <div className="next-gallery-grid">
          {Array.from({ length: size === 'large' ? 8 : 4 }).map((_, index) => (
            <span key={index} className={`tone-${index % 4}`} />
          ))}
        </div>
        {size !== 'small' ? <span>{label}</span> : null}
      </div>
    );
  }

  if (type === 'toolPalette') {
    return (
      <div className={`next-control-mock next-tool-palette size-${size}`}>
        <div className="next-tool-grid">
          <MousePointer2 size={13} />
          <Edit3 size={13} />
          <Pentagon size={13} />
          <Circle size={13} />
        </div>
        {size !== 'small' ? <span>{label}</span> : null}
      </div>
    );
  }

  if (type === 'menu') {
    return (
      <div className={`next-control-mock next-menu size-${size}`}>
        <span>{label}</span>
        <ChevronDown size={12} />
      </div>
    );
  }

  if (type === 'splitButton') {
    return (
      <div className={`next-control-mock next-split size-${size}`}>
        <span className="next-stack-icon">
          <span />
          <span />
          <span />
        </span>
        <ChevronDown size={12} />
        {size !== 'small' ? <small>{label}</small> : null}
      </div>
    );
  }

  if (type === 'tool') {
    return (
      <div className={`next-control-mock next-tool size-${size}`}>
        <Square size={size === 'large' ? 20 : 15} />
        {size !== 'small' ? <span className="next-dashed" /> : null}
        {size !== 'small' ? <Edit3 size={13} /> : null}
        {size !== 'small' ? <small>{label}</small> : null}
      </div>
    );
  }

  return (
    <div className={`next-control-mock next-button size-${size}`}>
      <Diamond size={size === 'large' ? 24 : 16} />
      {size !== 'small' ? <span>{label}</span> : null}
    </div>
  );
}
