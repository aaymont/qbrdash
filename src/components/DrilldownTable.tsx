import { useState } from "react";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
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
}

interface DrilldownTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  searchFields?: (keyof T)[];
  rowsPerPageOptions?: number[];
}

export function DrilldownTable<T extends Record<string, unknown>>({
  rows,
  columns,
  getRowId,
  onRowClick,
  searchFields,
  rowsPerPageOptions = [10, 25, 50],
}: DrilldownTableProps<T>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0] ?? 10);
  const [search, setSearch] = useState("");

  const filtered =
    search && searchFields
      ? rows.filter((r) =>
          searchFields.some((f) => {
            const v = r[f];
            return String(v ?? "").toLowerCase().includes(search.toLowerCase());
          })
        )
      : rows;

  const paginated = filtered.slice(
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
              {columns.map((col) => (
                <TableCell key={String(col.id)}>{col.label}</TableCell>
              ))}
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
                sx={onRowClick ? { cursor: "pointer" } : {}}
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
        count={filtered.length}
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
