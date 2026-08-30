'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** classes for the trigger button (merged with the base style) */
  className?: string;
  ariaLabel?: string;
  id?: string;
}

type MenuPos = {
  left: number;
  width: number;
  placement: 'down' | 'up';
  maxHeight: number;
  top?: number;
  bottom?: number;
};

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Bitte wählen',
  disabled = false,
  className = '',
  ariaLabel,
  id,
}: SelectProps) {
  const reactId = useId();
  const listboxId = id ? `${id}-listbox` : `${reactId}-listbox`;

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : '';

  const openMenu = useCallback(() => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : options.findIndex((o) => !o.disabled));
    setOpen(true);
  }, [selectedIndex, options]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const placement: 'down' | 'up' = spaceBelow < 240 && spaceAbove > spaceBelow ? 'up' : 'down';
    const maxHeight = Math.max(160, Math.min(280, (placement === 'down' ? spaceBelow : spaceAbove) - 16));
    setPos({
      left: rect.left,
      width: rect.width,
      placement,
      maxHeight,
      ...(placement === 'down'
        ? { top: rect.bottom + 6 }
        : { bottom: window.innerHeight - rect.top + 6 }),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  const commit = (index: number) => {
    const opt = options[index];
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const moveActive = (dir: 1 | -1) => {
    setActiveIndex((prev) => {
      let next = prev;
      for (let i = 0; i < options.length; i += 1) {
        next = (next + dir + options.length) % options.length;
        if (!options[next]?.disabled) return next;
      }
      return prev;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveActive(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveActive(-1);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(options.findIndex((o) => !o.disabled));
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(options.length - 1 - [...options].reverse().findIndex((o) => !o.disabled));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        commit(activeIndex);
        break;
      default:
        break;
    }
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          if (disabled) return;
          if (open) setOpen(false);
          else openMenu();
        }}
        onKeyDown={onKeyDown}
        className={`w-full flex items-center justify-between gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-left text-white transition-colors focus:outline-none focus:border-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed ${
          open ? 'border-cyan-500' : 'hover:border-white/20'
        } ${className}`}
      >
        <span className={`truncate ${selectedLabel ? 'text-white' : 'text-gray-500'}`}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && pos && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            id={listboxId}
            tabIndex={-1}
            style={{
              position: 'fixed',
              left: pos.left,
              width: pos.width,
              ...(pos.placement === 'down' ? { top: pos.top } : { bottom: pos.bottom }),
              maxHeight: pos.maxHeight,
              zIndex: 9999,
            }}
            className="overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-[#141414] shadow-2xl shadow-black/60 backdrop-blur-xl p-1 select-menu-animate"
          >
            {options.map((opt, index) => {
              const isSelected = opt.value === value;
              const isActive = index === activeIndex;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  onMouseEnter={() => !opt.disabled && setActiveIndex(index)}
                  onClick={() => commit(index)}
                  className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    isActive ? 'bg-white/10 text-white' : 'text-gray-300'
                  } ${isSelected ? 'text-cyan-300' : ''}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="w-4 h-4 flex-shrink-0 text-cyan-300" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
