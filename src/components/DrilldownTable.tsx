import { useState, useMemo } from "react";
import { motion } from "framer-motion";

const zenith = {
  neutral100: "var(--zenith-neutral-100, #EDEBE9)",
  neutral500: "var(--zenith-neutral-500, #605E5C)",
  neutral700: "var(--zenith-neutral-700, #3B3A39)",
  neutral900: "var(--zenith-neutral-900, #201F1E)",
  primary: "var(--zenith-primary, #0078D4)",
  spacing: "var(--zenith-spacing-md, 16px)",
  fontFamily: "var(--zenith-font-family, 'Segoe UI', sans-serif)",
};

const MotionTableRow = motion.tr;

export interface Column<T> {
  id: keyof T | string;
  label: string;
  format?: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string;
  sortable?: boolean;
}

export interface SortConfig {
  id: string;
  direction: "asc" | "desc";
}

interface DrilldownTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  searchFields?: (keyof T)[];
  rowsPerPageOptions?: number[];
  defaultSort?: SortConfig;
}

export function DrilldownTable<T extends Record<string, unknown>>({
  rows,
  columns,
  getRowId,
  onRowClick,
  searchFields,
  rowsPerPageOptions = [10, 25, 50],
  defaultSort,
}: DrilldownTableProps<T>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0] ?? 10);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(defaultSort ?? null);

  const filtered =
    search && searchFields
      ? rows.filter((r) =>
          searchFields.some((f) => {
            const v = r[f];
            return String(v ?? "").toLowerCase().includes(search.toLowerCase());
          })
        )
      : rows;

  const sorted = useMemo(() => {
    if (!sortConfig) return filtered;
    const col = columns.find((c) => String(c.id) === sortConfig.id);
    if (!col || col.sortable === false) return filtered;
    const getVal = col.sortValue ?? ((r: T) => r[col.id as keyof T]);
    return [...filtered].sort((a, b) => {
      const va = getVal(a);
      const vb = getVal(b);
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va ?? "").localeCompare(String(vb ?? ""));
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortConfig, columns]);

  const handleSort = (id: string) => {
    const col = columns.find((c) => String(c.id) === id);
    if (!col || col.sortable === false) return;
    setSortConfig((prev) =>
      prev?.id === id
        ? { id, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { id, direction: "desc" }
    );
    setPage(0);
  };

  const paginated = sorted.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <>
      {searchFields && searchFields.length > 0 && (
        <div style={{ marginBottom: zenith.spacing }}>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            style={{
              padding: "8px 12px",
              fontSize: 14,
              borderRadius: 4,
              border: `1px solid ${zenith.neutral100}`,
              width: "100%",
              maxWidth: 280,
              fontFamily: zenith.fontFamily,
            }}
          />
        </div>
      )}
      <div
        style={{
          border: `1px solid ${zenith.neutral100}`,
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: "white",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: zenith.fontFamily }}>
          <thead>
            <tr>
              {columns.map((col) => {
                const isSortable = col.sortable !== false;
                const isActive = sortConfig?.id === String(col.id);
                return (
                  <th
                    key={String(col.id)}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      borderBottom: `1px solid ${zenith.neutral100}`,
                      fontSize: 12,
                      fontWeight: 600,
                      color: zenith.neutral700,
                      backgroundColor: "rgba(0,0,0,0.02)",
                    }}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(String(col.id))}
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          font: "inherit",
                          color: "inherit",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {col.label}
                        {isActive && (
                          <span>{sortConfig?.direction === "asc" ? "↑" : "↓"}</span>
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, idx) => (
              <MotionTableRow
                key={getRowId(row)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                style={{
                  backgroundColor: (page * rowsPerPage + idx) % 2 === 1 ? "rgba(0,0,0,0.02)" : "transparent",
                  cursor: onRowClick ? "pointer" : "default",
                }}
                whileHover={onRowClick ? { backgroundColor: "rgba(0,0,0,0.04)" } : undefined}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.id)}
                    style={{
                      padding: "12px 16px",
                      borderBottom: `1px solid ${zenith.neutral100}`,
                      fontSize: 14,
                      color: zenith.neutral900,
                    }}
                  >
                    {col.format
                      ? col.format(row)
                      : String(row[col.id as keyof T] ?? "")}
                  </td>
                ))}
              </MotionTableRow>
            ))}
          </tbody>
        </table>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: zenith.spacing,
          marginTop: zenith.spacing,
          fontSize: 12,
          color: zenith.neutral500,
        }}
      >
        <span>
          {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, sorted.length)} of {sorted.length}
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              padding: "4px 8px",
              border: `1px solid ${zenith.neutral100}`,
              borderRadius: 4,
              backgroundColor: "white",
              cursor: page === 0 ? "not-allowed" : "pointer",
              opacity: page === 0 ? 0.5 : 1,
            }}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(Math.ceil(sorted.length / rowsPerPage) - 1, p + 1))}
            disabled={page >= Math.ceil(sorted.length / rowsPerPage) - 1}
            style={{
              padding: "4px 8px",
              border: `1px solid ${zenith.neutral100}`,
              borderRadius: 4,
              backgroundColor: "white",
              cursor: page >= Math.ceil(sorted.length / rowsPerPage) - 1 ? "not-allowed" : "pointer",
              opacity: page >= Math.ceil(sorted.length / rowsPerPage) - 1 ? 0.5 : 1,
            }}
          >
            Next
          </button>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            style={{
              padding: "4px 8px",
              border: `1px solid ${zenith.neutral100}`,
              borderRadius: 4,
              backgroundColor: "white",
            }}
          >
            {rowsPerPageOptions.map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
