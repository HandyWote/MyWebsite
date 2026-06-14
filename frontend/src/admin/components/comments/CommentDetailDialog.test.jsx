import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CommentDetailDialog from './CommentDetailDialog';

const mockComment = {
  id: 1,
  author: '测试用户',
  email: 'test@example.com',
  content: '这是一条详细评论',
  status: 'normal',
  ip_address: '192.168.1.1',
  article_title: '测试文章',
  created_at: '2024-01-15T10:30:00Z',
  user_agent: 'Mozilla/5.0',
};

describe('CommentDetailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('comment 为 null 时不渲染', () => {
    render(<CommentDetailDialog comment={null} open={true} onClose={vi.fn()} />);
    expect(screen.queryByText('评论详情')).not.toBeInTheDocument();
  });

  it('open=false 时不渲染', () => {
    render(<CommentDetailDialog comment={mockComment} open={false} onClose={vi.fn()} />);
    expect(screen.queryByText('评论详情')).not.toBeInTheDocument();
  });

  it('open=true 且 comment 存在时渲染详情', () => {
    render(<CommentDetailDialog comment={mockComment} open={true} onClose={vi.fn()} />);
    expect(screen.getByText('评论详情')).toBeInTheDocument();
    expect(screen.getByText('测试用户')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument();
    expect(screen.getByText('测试文章')).toBeInTheDocument();
    expect(screen.getByText('这是一条详细评论')).toBeInTheDocument();
  });

  it('渲染关闭按钮', () => {
    const onClose = vi.fn();
    render(<CommentDetailDialog comment={mockComment} open={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('关闭'));
    expect(onClose).toHaveBeenCalled();
  });

  it('无邮箱时显示"未提供"', () => {
    render(
      <CommentDetailDialog
        comment={{ ...mockComment, email: '' }}
        open={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('未提供')).toBeInTheDocument();
  });

  it('无 user_agent 时不显示该字段', () => {
    render(
      <CommentDetailDialog
        comment={{ ...mockComment, user_agent: '' }}
        open={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByText('用户代理')).not.toBeInTheDocument();
  });

  it('有 user_agent 时显示用户代理信息', () => {
    render(
      <CommentDetailDialog
        comment={mockComment}
        open={true}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('用户代理')).toBeInTheDocument();
    expect(screen.getByText('Mozilla/5.0')).toBeInTheDocument();
  });
});
