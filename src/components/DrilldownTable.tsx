import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  TextField,
  InputAdornment,
  Paper,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const MotionTableRow = motion(TableRow);

export interface Column<T> {
  id: keyof T | string;
  label: string;
  format?: (row: T) => React.ReactNode;
  /** Return comparable value for sorting. Defaults to row[id]. */
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
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(
    defaultSort ?? null
  );

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
        <TextField
          size="small"
          placeholder="Search..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
      )}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => {
                const isSortable = col.sortable !== false;
                const isActive = sortConfig?.id === String(col.id);
                return (
                  <TableCell key={String(col.id)} sortDirection={isActive ? sortConfig?.direction : false}>
                    {isSortable ? (
                      <TableSortLabel
                        active={isActive}
                        direction={isActive ? sortConfig?.direction : "desc"}
                        onClick={() => handleSort(String(col.id))}
                      >
                        {col.label}
                      </TableSortLabel>
                    ) : (
                      col.label
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((row, idx) => (
              <MotionTableRow
                key={getRowId(row)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02 }}
                whileHover={onRowClick ? { backgroundColor: "rgba(0,0,0,0.04)" } : undefined}
                onClick={() => onRowClick?.(row)}
                sx={{
                  ...(onRowClick ? { cursor: "pointer" } : {}),
                  backgroundColor:
                    (page * rowsPerPage + idx) % 2 === 1 ? "action.hover" : "transparent",
                }}
              >
                {columns.map((col) => (
                  <TableCell key={String(col.id)}>
                    {col.format
                      ? col.format(row)
                      : String(row[col.id as keyof T] ?? "")}
                  </TableCell>
                ))}
              </MotionTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={sorted.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={rowsPerPageOptions}
      />
    </>
  );
}
