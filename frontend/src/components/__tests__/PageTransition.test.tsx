import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageTransition from '../PageTransition';

describe('PageTransition', () => {
  it('renders children', () => {
    render(<PageTransition><span>hello</span></PageTransition>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('renders multiple children', () => {
    render(
      <PageTransition>
        <span>item1</span>
        <span>item2</span>
      </PageTransition>,
    );
    expect(screen.getByText('item1')).toBeInTheDocument();
    expect(screen.getByText('item2')).toBeInTheDocument();
  });

  it('renders with a Box wrapper', () => {
    const { container } = render(<PageTransition><span>test</span></PageTransition>);
    // sx 生成的是 emotion CSS 类而非内联样式，jsdom 中验证包装结构即可
    expect(container.firstElementChild?.tagName).toBe('DIV');
  });

  it('accepts custom stagger prop without error', () => {
    const { container } = render(
      <PageTransition stagger={200}>
        <span>delayed</span>
      </PageTransition>,
    );
    expect(screen.getByText('delayed')).toBeInTheDocument();
    expect(container.firstElementChild?.tagName).toBe('DIV');
  });
});
