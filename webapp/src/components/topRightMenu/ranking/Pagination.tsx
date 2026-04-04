import { useState } from 'react';
import styles from './Pagination.module.css';

const ROWS_PER_PAGE = 5;

// Hook: encapsulates page state and slicing logic.
// Returns the current page's slice of data plus controls to change the page.
export function usePagination<T>(data: T[]) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(data.length / ROWS_PER_PAGE));
  const pageData = data.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  // Sliding window of 3 page numbers centered around the current page
  const startPage = Math.max(1, Math.min(currentPage - 1, totalPages - 2));
  const visiblePages = Array.from({ length: Math.min(3, totalPages) }, (_, i) => startPage + i);

  return { currentPage, setCurrentPage, totalPages, pageData, visiblePages };
}

// Component: renders First / page numbers / Last buttons.
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  visiblePages: number[];
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, visiblePages, onPageChange }: Readonly<PaginationProps>) {
  if (totalPages <= 1) return null;

  return (
    <div className={styles.pagination}>
      <button
        className={styles.pageBtn}
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
      >
        First
      </button>

      {visiblePages.map(page => (
        <button
          key={page}
          className={`${styles.pageBtn} ${page === currentPage ? styles.pageBtnActive : ''}`}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}

      <button
        className={styles.pageBtn}
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
      >
        Last
      </button>
    </div>
  );
}
