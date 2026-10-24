// frontend/src/components/pixel/ui/PixelInput.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MenuItem } from '@mui/material';
import type { ChangeEvent, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PixelProvider } from '../PixelProvider';
import PixelInput from './PixelInput';

const renderInput = (ui: ReactNode) => render(<PixelProvider>{ui}</PixelProvider>);

const getOutlineRoot = (container: HTMLElement): Element => {
  const root = container.querySelector('.MuiOutlinedInput-root');
  if (!root) throw new Error('outlined input root not found');
  return root;
};

type InputChangeEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

describe('PixelInput', () => {
  it('renders label and value, and reports typing through onChange', () => {
    const typed: string[] = [];
    const onChange = vi.fn((event: InputChangeEvent) => {
      typed.push(event.target.value);
    });
    renderInput(<PixelInput label="$ name" value="" onChange={onChange} />);

    const input = screen.getByLabelText('$ name');
    fireEvent.change(input, { target: { value: 'ada' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(typed).toEqual(['ada']);
  });

  it('puts data-testid on the root element so [data-testid] input queries keep working', () => {
    const { container } = renderInput(
      <PixelInput label="首页标题" data-testid="field-home-title" defaultValue="hi" />
    );

    const root = screen.getByTestId('field-home-title');
    expect(root).toBe(container.firstChild);
    expect(root.querySelector('input')).toHaveValue('hi');
  });

  it('keeps the terminal visual baseline (dashed border, square corners, tertiary fill)', () => {
    const { container } = renderInput(<PixelInput label="$ message" />);

    const outlineRoot = getOutlineRoot(container);
    expect(outlineRoot).toHaveStyle({
      borderRadius: '0',
      backgroundColor: 'rgb(33, 38, 45)',
    });
    expect(outlineRoot.querySelector('fieldset')).toHaveStyle({ borderStyle: 'dashed' });
  });

  it('renders multiline as a textarea with the requested rows', () => {
    renderInput(<PixelInput label="$ message" multiline rows={3} defaultValue="a" />);

    const textarea = screen.getByLabelText('$ message');
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveAttribute('rows', '3');
  });

  it('shows helperText and reserves its line height', () => {
    const { container } = renderInput(
      <PixelInput label="标签" error helperText="标签格式不合法" />
    );

    const helper = container.querySelector('.MuiFormHelperText-root');
    expect(helper).toHaveTextContent('标签格式不合法');
    expect(helper).toHaveStyle({ minHeight: '1.25em' });
  });

  it('supports select with children as the dropdown options', () => {
    const picked: string[] = [];
    const onChange = vi.fn((event: InputChangeEvent) => {
      picked.push(event.target.value);
    });
    renderInput(
      <PixelInput label="图标类型" select value="github" onChange={onChange}>
        <MenuItem value="github">GitHub</MenuItem>
        <MenuItem value="email">邮件</MenuItem>
      </PixelInput>
    );

    fireEvent.mouseDown(screen.getByRole('combobox', { name: '图标类型' }));
    fireEvent.click(screen.getByRole('option', { name: '邮件' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(picked).toEqual(['email']);
  });

  it('forwards slotProps to the input so adornments can be added', () => {
    renderInput(
      <PixelInput
        label="搜索"
        slotProps={{
          input: {
            startAdornment: <span data-testid="search-adornment">@</span>,
          },
        }}
      />
    );

    expect(screen.getByTestId('search-adornment')).toBeInTheDocument();
  });

  it('merges caller sx after the pixel baseline', () => {
    const { container } = renderInput(
      <PixelInput label="备注" sx={{ mt: '11px' }} />
    );

    expect(container.firstChild).toHaveStyle({ marginTop: '11px' });
  });

  it('does not take width by default (public pages keep their own layout)', () => {
    const { container } = renderInput(<PixelInput label="默认宽度" />);

    expect(container.firstChild).not.toHaveClass('MuiFormControl-fullWidth');
  });

  it('honours fullWidth when the caller asks for it', () => {
    const { container } = renderInput(<PixelInput label="撑满" fullWidth />);

    expect(container.firstChild).toHaveClass('MuiFormControl-fullWidth');
  });
});
