"use client";

import type { Category } from "@/lib/types/landing";

interface CategoryGridProps {
  categories: Category[];
  onCategorySelect?: (categoryId: string) => void;
}

export function CategoryGrid({
  categories,
  onCategorySelect,
}: CategoryGridProps) {
  if (categories.length === 0) return null;

  return (
    <div className="border-b border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex items-center gap-2.5 overflow-x-auto py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button
            type="button"
            onClick={() => onCategorySelect?.("all")}
            className="shrink-0 rounded-full border border-primary/30 bg-primary/8 px-5 py-2 text-[10px] font-bold uppercase tracking-[0.3em] text-primary transition-all hover:bg-primary/12"
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => onCategorySelect?.(category.id)}
              className="shrink-0 rounded-full border border-border/60 bg-background px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground motion-standard hover:border-foreground/20 hover:bg-muted/50 hover:text-foreground"
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
