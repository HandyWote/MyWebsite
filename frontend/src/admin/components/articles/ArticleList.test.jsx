// frontend/src/admin/components/articles/ArticleList.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ArticleList from './ArticleList';

describe('ArticleList', () => {
  const mockArticles = [
    { id: 1, title: 'Article 1', summary: 'Summary 1', category: 'Tech', tags: ['react'], created_at: '2024-01-01' },
    { id: 2, title: 'Article 2', summary: 'Summary 2', category: 'Life', tags: ['travel'], created_at: '2024-01-02' },
  ];

  const defaultProps = {
    articles: mockArticles,
    loading: false,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    selectedIds: [],
    onSelectionChange: vi.fn(),
    pagination: { page: 1, perPage: 10, total: 2 },
    onPageChange: vi.fn(),
    onRowsPerPageChange: vi.fn(),
  };

  it('应该渲染文章列表', () => {
    render(<ArticleList {...defaultProps} />);

    expect(screen.getByText('Article 1')).toBeInTheDocument();
    expect(screen.getByText('Article 2')).toBeInTheDocument();
  });

  it('loading 且文章为空时应该显示加载状态', () => {
    render(<ArticleList {...defaultProps} articles={[]} loading={true} />);

    // 应该显示加载指示器
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('文章为空时应该显示空状态', () => {
    render(<ArticleList {...defaultProps} articles={[]} />);

    expect(screen.getByText(/暂无文章/)).toBeInTheDocument();
  });

  it('点击编辑按钮应该调用 onEdit', () => {
    render(<ArticleList {...defaultProps} />);

    const editButtons = screen.getAllByLabelText(/编辑/);
    fireEvent.click(editButtons[0]);

    expect(defaultProps.onEdit).toHaveBeenCalledWith(mockArticles[0]);
  });

  it('点击删除按钮应该调用 onDelete', () => {
    render(<ArticleList {...defaultProps} />);

    const deleteButtons = screen.getAllByLabelText(/删除/);
    fireEvent.click(deleteButtons[0]);

    expect(defaultProps.onDelete).toHaveBeenCalledWith(mockArticles[0].id);
  });

  it('应该正确显示分类', () => {
    render(<ArticleList {...defaultProps} />);

    expect(screen.getByText('Tech')).toBeInTheDocument();
    expect(screen.getByText('Life')).toBeInTheDocument();
  });

  it('应该正确显示标签', () => {
    render(<ArticleList {...defaultProps} />);

    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('travel')).toBeInTheDocument();
  });

  it('勾选复选框应该调用 onSelectionChange', () => {
    render(<ArticleList {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // 第一行数据的复选框（跳过表头）

    expect(defaultProps.onSelectionChange).toHaveBeenCalled();
  });

  it('全选复选框应该选中所有文章', () => {
    render(<ArticleList {...defaultProps} />);

    const selectAllCheckbox = screen.getAllByRole('checkbox')[0]; // 表头复选框
    fireEvent.click(selectAllCheckbox);

    expect(defaultProps.onSelectionChange).toHaveBeenCalledWith([1, 2]);
  });

  it('应该显示分页信息', () => {
    render(<ArticleList {...defaultProps} />);

    expect(screen.getByText(/每页行数/)).toBeInTheDocument();
  });
});
