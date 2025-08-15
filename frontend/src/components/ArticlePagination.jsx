import React from 'react';
import { Box, Pagination } from '@mui/material';

/**
 * 文章分页组件
 * 提供分页导航功能
 */
const ArticlePagination = ({ currentPage, totalPages, onPageChange }) => {
  // 只有当总页数大于1时才显示分页
  if (totalPages <= 1) {
    return null;
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
      <Pagination
        count={totalPages}
        page={currentPage}
        onChange={onPageChange}
        color="primary"
        size="large"
        showFirstButton
        showLastButton
        siblingCount={1}
        boundaryCount={1}
      />
    </Box>
  );
};

export default ArticlePagination;
