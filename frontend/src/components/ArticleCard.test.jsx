import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ArticleCard from './ArticleCard';

describe('ArticleCard Component', () => {
  const mockArticle = {
    id: 1,
    title: 'Test Article',
    category: 'Tech',
    tags: ['react', 'javascript'],
    summary: 'This is a test summary',
    cover_image: '/cover.jpg',
    created_at: '2024-01-01T00:00:00Z'
  };

  const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('should render article title', () => {
    renderWithRouter(<ArticleCard article={mockArticle} />);
    expect(screen.getByText('Test Article')).toBeInTheDocument();
  });

  it('should render article category', () => {
    renderWithRouter(<ArticleCard article={mockArticle} />);
    expect(screen.getByText('Tech')).toBeInTheDocument();
  });

  it('should render article summary', () => {
    renderWithRouter(<ArticleCard article={mockArticle} />);
    expect(screen.getByText('This is a test summary')).toBeInTheDocument();
  });
});
