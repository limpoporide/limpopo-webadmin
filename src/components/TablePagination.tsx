"use client";

type TablePaginationProps = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
};

export default function TablePagination({
  currentPage,
  pageSize,
  totalItems,
  itemLabel,
  onPageChange,
}: TablePaginationProps) {
  if (totalItems === 0) {
    return null;
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startItem = (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 text-sm dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-gray-600 dark:text-gray-300">
        Showing {startItem} to {endItem} of {totalItems} {itemLabel}
      </div>

      <div className="flex items-center gap-3 self-end sm:self-auto">
        <span className="text-gray-500 dark:text-gray-400">
          Page {safePage} of {totalPages}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Previous
          </button>

          <button
            type="button"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
