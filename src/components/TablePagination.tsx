import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

export function TablePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
}: TablePaginationProps) {
  if (totalItems === 0) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers
  const pages = [];
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 border-t border-border bg-card rounded-b-xl">
      <div className="flex items-center gap-4 text-sm text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
        <div>
          Showing {start} to {end} of {totalItems} entries
        </div>
        <div className="flex items-center gap-2">
          <span>Rows:</span>
          <Select value={String(pageSize)} onValueChange={val => onPageSizeChange(Number(val))}>
            <SelectTrigger className="w-16 h-8 py-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map(sz => (
                <SelectItem key={sz} value={String(sz)}>
                  {sz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="w-8 h-8"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {startPage > 1 && (
          <>
            <Button
              variant={currentPage === 1 ? "default" : "outline"}
              className="w-8 h-8 p-0"
              onClick={() => onPageChange(1)}
            >
              1
            </Button>
            {startPage > 2 && <span className="text-muted-foreground px-1 text-xs">...</span>}
          </>
        )}
        {pages.map(p => (
          <Button
            key={p}
            variant={currentPage === p ? "default" : "outline"}
            className="w-8 h-8 p-0"
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ))}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-muted-foreground px-1 text-xs">...</span>}
            <Button
              variant={currentPage === totalPages ? "default" : "outline"}
              className="w-8 h-8 p-0"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </Button>
          </>
        )}
        <Button
          variant="outline"
          size="icon"
          className="w-8 h-8"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
