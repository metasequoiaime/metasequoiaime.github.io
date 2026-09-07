import type { TocEntry } from "./toc";

type TocNavProps = {
  entries: TocEntry[];
  activeId: string | null;
  tocRef: React.RefObject<HTMLElement | null>;
  onSelect: (id: string) => void;
  onNavigateNarrow?: () => void;
};

/** 侧栏里的小节索引。文档页和内容页共用，站内同一个东西只有一种样子。 */
export function TocNav({ entries, activeId, tocRef, onSelect, onNavigateNarrow }: TocNavProps) {
  return (
    <nav className="docs-toc" id="docs-toc" ref={tocRef as React.RefObject<HTMLElement>}>
      {entries.map((entry) => (
        <a
          key={entry.id}
          href={`#${entry.id}`}
          className={`${entry.isSubItem ? "docs-toc-subitem" : ""}${entry.id === activeId ? " is-active" : ""}`.trim()}
          aria-current={entry.id === activeId ? "location" : undefined}
          onClick={() => {
            onSelect(entry.id);
            if (window.matchMedia("(max-width: 900px)").matches) onNavigateNarrow?.();
          }}
        >
          {entry.text}
        </a>
      ))}
    </nav>
  );
}
