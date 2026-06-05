import React from 'react';
import { normaliseTravelOptionText } from '../../data/travelOptions.js';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const getOptionKey = (option, index) => `${option.value || option.label || option.id || 'option'}-${option.iataCode || option.countryRegion || ''}-${index}`;

function Highlight({ text, query }) {
  const safeText = `${text || ''}`;
  const trimmedQuery = `${query || ''}`.trim();
  if (!trimmedQuery) return safeText;
  const match = safeText.match(new RegExp(escapeRegExp(trimmedQuery), 'i'));
  if (!match || match.index === undefined) return safeText;
  const start = match.index;
  const end = start + match[0].length;
  return (
    <>
      {safeText.slice(0, start)}
      <mark>{safeText.slice(start, end)}</mark>
      {safeText.slice(end)}
    </>
  );
}

export function SmartTravelField({
  icon: Icon,
  label,
  name,
  value,
  placeholder,
  className = '',
  options = [],
  groupedOptions = [],
  showGroupsWhenEmpty = false,
  onChange,
  onBlur,
  getOptionValue = (option) => option.value || option.label || '',
  getOptionLabel = (option) => option.label || option.name || '',
  getOptionMeta = () => '',
  emptyHint = 'Start typing to search',
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const wrapperRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const reactId = React.useId();
  const inputId = `${name}-${reactId}`;
  const labelId = `${name}-${reactId}-label`;
  const listboxId = `${name}-${reactId}-listbox`;
  const query = `${value || ''}`;
  const flatOptions = React.useMemo(() => (
    showGroupsWhenEmpty && !normaliseTravelOptionText(query)
      ? groupedOptions.flatMap((group) => group.options || [])
      : options
  ), [groupedOptions, options, query, showGroupsWhenEmpty]);
  const hasOptions = flatOptions.length > 0;
  const activeOption = flatOptions[activeIndex];

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [isOpen]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [flatOptions.length, query]);

  const selectOption = (option) => {
    if (!option) return;
    onChange(name, getOptionValue(option));
    setIsOpen(false);
    if (document.activeElement !== inputRef.current) window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setActiveIndex((index) => (hasOptions ? (index + 1) % flatOptions.length : 0));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setActiveIndex((index) => (hasOptions ? (index - 1 + flatOptions.length) % flatOptions.length : 0));
    }
    if (event.key === 'Enter' && isOpen && activeOption) {
      event.preventDefault();
      selectOption(activeOption);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  const renderOption = (option, index) => {
    const primary = getOptionLabel(option);
    const meta = getOptionMeta(option);
    const isActive = flatOptions.indexOf(option) === activeIndex || index === activeIndex;
    return (
      <button
        key={getOptionKey(option, index)}
        id={`${listboxId}-${index}`}
        type="button"
        role="option"
        aria-selected={isActive}
        className={isActive ? 'active' : ''}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => selectOption(option)}
      >
        <span><Highlight text={primary} query={query} /></span>
        {meta && <b><Highlight text={meta} query={query} /></b>}
      </button>
    );
  };

  return (
    <div className={`field smart-field ${className}`.trim()} ref={wrapperRef}>
      <span id={labelId}>{label}</span>
      <p>
        {Icon && <Icon size={18} />}
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          value={value ?? ''}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => { onChange(name, event.target.value); setIsOpen(true); }}
          onBlur={(event) => onBlur?.(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-labelledby={labelId}
          aria-controls={listboxId}
          aria-expanded={isOpen && hasOptions}
          aria-activedescendant={isOpen && activeOption ? `${listboxId}-${activeIndex}` : undefined}
        />
      </p>
      {isOpen && (
        <div className="smart-suggestions" id={listboxId} role="listbox" aria-label={`${label} suggestions`}>
          {hasOptions ? (
            showGroupsWhenEmpty && !normaliseTravelOptionText(query) ? groupedOptions.map((group) => (
              <div className="smart-suggestion-group" key={group.label} role="group" aria-label={group.label}>
                <em>{group.label}</em>
                {(group.options || []).map((option) => renderOption(option, flatOptions.indexOf(option)))}
              </div>
            )) : flatOptions.map(renderOption)
          ) : (
            <div className="smart-suggestions-empty">{emptyHint}</div>
          )}
        </div>
      )}
    </div>
  );
}
