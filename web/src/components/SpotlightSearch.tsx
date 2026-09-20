import React, { useEffect, useRef } from 'react';
import { Search, X, LayoutGrid, List } from 'lucide-react';

export type FileFilterCategory = 'all' | 'pdf' | 'word' | 'image' | 'video' | 'markdown';

interface SpotlightSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedFilter: FileFilterCategory;
  onFilterChange: (filter: FileFilterCategory) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  counts?: {
    all: number;
    pdf: number;
    word: number;
    image: number;
    video: number;
    markdown: number;
  };
  placeholder?: string;
}

export const SpotlightSearch: React.FC<SpotlightSearchProps> = ({
  searchQuery,
  onSearchChange,
  selectedFilter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  counts,
  placeholder = 'Tìm kiếm tài liệu...',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filterOptions: { id: FileFilterCategory; label: string; count?: number }[] = [
    { id: 'all', label: 'Tất cả', count: counts?.all },
    { id: 'pdf', label: 'PDF', count: counts?.pdf },
    { id: 'word', label: 'Văn bản', count: counts?.word },
    { id: 'image', label: 'Hình ảnh', count: counts?.image },
    { id: 'video', label: 'Video', count: counts?.video },
    { id: 'markdown', label: 'Markdown', count: counts?.markdown },
  ];

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-2 rounded-2xl bg-white/80 backdrop-blur-2xl border border-black/[0.06] shadow-sm">
      {/* Spotlight Input Box */}
      <div className="relative flex-1 group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b] group-focus-within:text-[#0071e3] transition-colors" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-20 py-2 rounded-xl bg-black/[0.03] hover:bg-black/[0.05] focus:bg-white border border-black/[0.06] focus:border-[#0071e3] text-[#1d1d1f] placeholder-[#86868b] text-xs focus:outline-none focus:ring-2 focus:ring-[#0071e3]/15 transition-all shadow-inner"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="p-1 rounded-full text-[#86868b] hover:text-[#1d1d1f] hover:bg-black/5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/[0.06] text-[10px] text-[#6e6e73] font-mono border border-black/[0.08]">
            <span className="text-[11px]">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Filter Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
        {filterOptions.map((opt) => {
          const isSelected = selectedFilter === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onFilterChange(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-white text-[#1d1d1f] border border-black/[0.08] font-semibold shadow-sm'
                  : 'text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/[0.03]'
              }`}
            >
              <span>{opt.label}</span>
              {typeof opt.count === 'number' && opt.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-black/[0.08] text-[#1d1d1f]' : 'bg-black/[0.04] text-[#86868b]'
                  }`}
                >
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* macOS Finder View Mode Switcher (Grid / List) */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-black/[0.04] border border-black/[0.06] self-end md:self-auto">
        <button
          type="button"
          onClick={() => onViewModeChange('grid')}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            viewMode === 'grid'
              ? 'bg-white text-[#1d1d1f] shadow-sm'
              : 'text-[#86868b] hover:text-[#1d1d1f]'
          }`}
          title="Chế độ xem lưới (Grid View)"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('list')}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            viewMode === 'list'
              ? 'bg-white text-[#1d1d1f] shadow-sm'
              : 'text-[#86868b] hover:text-[#1d1d1f]'
          }`}
          title="Chế độ xem danh sách (List View)"
        >
          <List className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
