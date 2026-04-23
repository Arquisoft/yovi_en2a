import { useState } from 'react';

const ROWS_PER_PAGE = 5;

export function usePagination<T>(data: T[]) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(data.length / ROWS_PER_PAGE));
  const pageData = data.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const startPage = Math.max(1, Math.min(currentPage - 1, totalPages - 2));
  const visiblePages = Array.from({ length: Math.min(3, totalPages) }, (_, i) => startPage + i);

  return { currentPage, setCurrentPage, totalPages, pageData, visiblePages };
}
