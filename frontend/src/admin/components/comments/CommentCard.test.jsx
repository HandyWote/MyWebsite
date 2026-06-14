import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CommentCard, { COMMENT_STATUS, getCommentStatusConfig } from './CommentCard';

const mockComment = {
  id: 1,
  author: '测试用户',
  email: 'test@example.com',
  content: '这是一条测试评论内容',
  status: 'normal',
  ip_address: '192.168.1.1',
  article_title: '测试文章',
  created_at: '2024-01-15T10:30:00Z',
};

describe('CommentCard', () => {
  const defaultProps = {
    comment: mockComment,
    onView: vi.fn(),
    onDelete: vi.fn(),
    onStatusChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('comment 为 null 时不渲染', () => {
    render(<CommentCard {...defaultProps} comment={null} />);
    expect(screen.queryByText('测试用户')).not.toBeInTheDocument();
  });

  it('渲染评论者名称和内容', () => {
    render(<CommentCard {...defaultProps} />);
    expect(screen.getByText('测试用户')).toBeInTheDocument();
    expect(screen.getByText('这是一条测试评论内容')).toBeInTheDocument();
  });

  it('渲染正确的状态标签', () => {
    render(<CommentCard {...defaultProps} />);
    expect(screen.getByText('正常')).toBeInTheDocument();
  });

  it('渲染 IP 地址和文章标题', () => {
    render(<CommentCard {...defaultProps} />);
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    expect(screen.getByText('测试文章')).toBeInTheDocument();
  });

  it('渲染邮箱', () => {
    render(<CommentCard {...defaultProps} />);
    expect(screen.getByText('邮箱: test@example.com')).toBeInTheDocument();
  });

  it('无邮箱时不渲染邮箱行', () => {
    render(<CommentCard {...defaultProps} comment={{ ...mockComment, email: '' }} />);
    expect(screen.queryByText(/邮箱:/)).not.toBeInTheDocument();
  });

  it('点击菜单查看详情时调用 onView', () => {
    render(<CommentCard {...defaultProps} />);
    // MUI IconButton 需要通过 role 查找
    const moreButtons = screen.getAllByRole('button');
    const menuButton = moreButtons.find(btn => btn.querySelector('[data-testid="MoreVertIcon"]'));
    fireEvent.click(menuButton);
    fireEvent.click(screen.getByText('查看详情'));
    expect(defaultProps.onView).toHaveBeenCalledWith(mockComment);
  });

  it('点击菜单删除时调用 onDelete', () => {
    render(<CommentCard {...defaultProps} />);
    const moreButtons = screen.getAllByRole('button');
    const menuButton = moreButtons.find(btn => btn.querySelector('[data-testid="MoreVertIcon"]'));
    fireEvent.click(menuButton);
    fireEvent.click(screen.getByText('删除评论'));
    expect(defaultProps.onDelete).toHaveBeenCalledWith(mockComment);
  });

  it('点击状态变更菜单项时调用 onStatusChange', () => {
    render(<CommentCard {...defaultProps} />);
    const moreButtons = screen.getAllByRole('button');
    const menuButton = moreButtons.find(btn => btn.querySelector('[data-testid="MoreVertIcon"]'));
    fireEvent.click(menuButton);
    fireEvent.click(screen.getByText('标记为待审核'));
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith(1, 'pending');
  });

  it('渲染 ID', () => {
    render(<CommentCard {...defaultProps} />);
    expect(screen.getByText('ID: 1')).toBeInTheDocument();
  });
});

describe('COMMENT_STATUS', () => {
  it('导出正确的状态枚举', () => {
    expect(COMMENT_STATUS.NORMAL).toBe('normal');
    expect(COMMENT_STATUS.PENDING).toBe('pending');
    expect(COMMENT_STATUS.SPAM).toBe('spam');
  });
});

describe('getCommentStatusConfig', () => {
  it('返回 normal 状态的配置', () => {
    const config = getCommentStatusConfig('normal');
    expect(config.label).toBe('正常');
    expect(config.color).toBe('success');
  });

  it('未知状态默认返回 normal 配置', () => {
    const config = getCommentStatusConfig('unknown');
    expect(config.label).toBe('正常');
  });
});
