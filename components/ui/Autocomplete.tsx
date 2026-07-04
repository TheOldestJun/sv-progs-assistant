/*
 * Autocomplete — переиспользуемый компонент поиска с выпадающим списком.
 * - Фильтрация по вводу (case-insensitive)
 * - Создание нового элемента если нет совпадений
 * - Клавиатурная навигация (ArrowUp/Down/Enter/Escape)
 * - Закрытие при клике вне компонента
 * Используется в HeadOfSupplyDashboard для продуктов, единиц, заявителей.
 */
"use client";

import {
  useState,
  useRef,
  useMemo,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";

export interface AutocompleteItem {
  id: string;
  title: string;
}

interface AutocompleteProps {
  items: AutocompleteItem[];
  value: AutocompleteItem | null;
  onSelect: (item: AutocompleteItem) => void;
  onCreate: (title: string) => AutocompleteItem;
  label?: string;
  placeholder?: string;
}

export function Autocomplete({
  items,
  value,
  onSelect,
  onCreate,
  label,
  placeholder = "Поиск...",
}: AutocompleteProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    return query.trim()
      ? items.filter((it) =>
          it.title.toLowerCase().includes(query.toLowerCase().trim()),
        )
      : items;
  }, [items, query]);

  const noMatch = query.trim().length > 0 && filtered.length === 0;

  useEffect(() => {
    setFocusedIdx(-1);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent | TouchEvent) {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, []);

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
  }

  function selectItem(item: AutocompleteItem) {
    onSelect(item);
    setQuery("");
    setOpen(false);
  }

  function handleCreate() {
    const trimmed = query.trim();
    if (!trimmed) return;
    const newItem = onCreate(trimmed);
    onSelect(newItem);
    setQuery("");
    setOpen(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const options = [...filtered, ...(noMatch ? [null] : [])];
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIdx((prev) => (prev < options.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIdx((prev) => (prev > 0 ? prev - 1 : options.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIdx >= 0 && focusedIdx < filtered.length) {
          selectItem(filtered[focusedIdx]);
        } else if (focusedIdx === filtered.length && noMatch) {
          handleCreate();
        }
        break;
      case "Escape":
        setOpen(false);
        setFocusedIdx(-1);
        break;
    }
  }

  return (
    <div className="relative">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={value ? value.title : placeholder}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm max-sm:py-2.5 text-foreground outline-none transition-colors placeholder:text-text-secondary focus:border-primary focus:ring-1 focus:ring-primary max-sm:min-h-11"
      />
      {open && (filtered.length > 0 || noMatch) && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-surface p-1 shadow-lg"
        >
          {filtered.map((item, idx) => (
            <li
              key={item.id}
              onClick={() => selectItem(item)}
              onMouseEnter={() => setFocusedIdx(idx)}
              className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm max-sm:py-2.5 max-sm:min-h-11 ${
                idx === focusedIdx
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-surface-secondary"
              }`}
            >
              {item.title}
            </li>
          ))}
          {noMatch && (
            <li
              onClick={handleCreate}
              onMouseEnter={() => setFocusedIdx(filtered.length)}
              className={`flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm max-sm:py-2.5 max-sm:min-h-11 ${
                focusedIdx === filtered.length
                  ? "bg-accent text-primary-foreground"
                  : "text-accent hover:bg-surface-secondary"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-4 shrink-0"
              >
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              <span>
                Добавить «<strong>{query.trim()}</strong>»
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
