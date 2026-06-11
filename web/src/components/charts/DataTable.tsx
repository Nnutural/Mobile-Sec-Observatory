import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { colors } from "@/design/colors";

type StringKeyOf<T> = Extract<keyof T, string>;
type SortDirection = "asc" | "desc";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => number | string;
  align?: "left" | "right" | "center";
  width?: string;
}

export interface DataTableProps<T> {
  columns: Array<DataTableColumn<T>>;
  rows: T[];
  pageSize?: number;
  searchPlaceholder?: string;
  searchKeys?: Array<StringKeyOf<T> | ((row: T) => string)>;
  emptyText?: string;
  caption?: string;
  onRowClick?: (row: T) => void;
  initialSort?: { key: string; direction: SortDirection };
}

interface SortState {
  key: string;
  direction: SortDirection;
}

function getRecordValue<T>(row: T, key: string): unknown {
  if (typeof row === "object" && row !== null && key in row) {
    return (row as Record<string, unknown>)[key];
  }
  return undefined;
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function compareValues(a: number | string, b: number | string): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "zh-CN", { numeric: true, sensitivity: "base" });
}

function alignmentClass(align: DataTableColumn<unknown>["align"]): string {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

export function DataTable<T>({
  columns,
  rows,
  pageSize = 10,
  searchPlaceholder = "搜索",
  searchKeys,
  emptyText = "暂无数据",
  caption,
  onRowClick,
  initialSort,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null);
  const [page, setPage] = useState(1);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    if (!searchKeys || normalizedQuery.length === 0) return rows;
    return rows.filter((row) =>
      searchKeys.some((searchKey) => {
        const value = typeof searchKey === "function" ? searchKey(row) : stringify(getRecordValue(row, searchKey));
        return value.toLowerCase().includes(normalizedQuery);
      }),
    );
  }, [normalizedQuery, rows, searchKeys]);

  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows;
    const column = columns.find((item) => item.key === sort.key);
    if (!column) return filteredRows;
    return [...filteredRows].sort((left, right) => {
      const leftValue = column.sortValue?.(left) ?? stringify(getRecordValue(left, column.key));
      const rightValue = column.sortValue?.(right) ?? stringify(getRecordValue(right, column.key));
      const result = compareValues(leftValue, rightValue);
      return sort.direction === "asc" ? result : -result;
    });
  }, [columns, filteredRows, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable) return;
    setPage(1);
    setSort((current) => {
      if (!current || current.key !== column.key) return { key: column.key, direction: "asc" };
      if (current.direction === "asc") return { key: column.key, direction: "desc" };
      return null;
    });
  };

  const setTargetPage = (nextPage: number) => {
    if (Number.isNaN(nextPage)) return;
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
  };

  return (
    <div className="space-y-3">
      {caption || searchKeys ? (
        <div className="flex items-center justify-between gap-4">
          {caption ? (
            <div className="text-sm" style={{ color: colors.gray[500] }}>
              {caption}
            </div>
          ) : (
            <span />
          )}
          {searchKeys ? (
            <Input
              className="max-w-xs"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => {
                setQuery(event.currentTarget.value);
                setPage(1);
              }}
            />
          ) : null}
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow style={{ backgroundColor: colors.gray[50] }}>
            {columns.map((column) => {
              const active = sort?.key === column.key;
              const triangle = active ? (sort.direction === "asc" ? "▲" : "▼") : "";
              return (
                <TableHead
                  key={column.key}
                  className={alignmentClass(column.align)}
                  style={{ width: column.width, color: colors.gray[700] }}
                >
                  {column.sortable ? (
                    <button
                      className="inline-flex items-center gap-1 rounded-sm transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2"
                      style={{ "--tw-ring-color": colors.primary[500] } as React.CSSProperties}
                      type="button"
                      onClick={() => toggleSort(column)}
                    >
                      <span>{column.header}</span>
                      <span aria-hidden="true" style={{ color: active ? colors.primary[500] : colors.gray[400] }}>
                        {triangle}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.length > 0 ? (
            pageRows.map((row, rowIndex) => (
              <TableRow
                key={rowIndex}
                className={onRowClick ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2" : undefined}
                style={{ "--tw-ring-color": colors.primary[500] } as React.CSSProperties}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={() => onRowClick?.(row)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") onRowClick?.(row);
                }}
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={alignmentClass(column.align)}>
                    {column.render ? column.render(row) : stringify(getRecordValue(row, column.key))}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell className="text-center" colSpan={columns.length} style={{ color: colors.gray[500] }}>
                {emptyText}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-end gap-3 text-sm" style={{ color: colors.gray[600] }}>
        <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setTargetPage(safePage - 1)}>
          上一页
        </Button>
        <span>
          第 {safePage} / {totalPages} 页
        </span>
        <label className="flex items-center gap-2">
          <span>跳至</span>
          <Input
            className="h-9 w-20"
            min={1}
            max={totalPages}
            type="number"
            value={safePage}
            onChange={(event) => setTargetPage(Number(event.currentTarget.value))}
          />
        </label>
        <Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setTargetPage(safePage + 1)}>
          下一页
        </Button>
      </div>
    </div>
  );
}
