import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders a primary button and handles clicks', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Guardar</Button>);

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled while loading and exposes aria-busy', () => {
    render(<Button loading>Cargando</Button>);

    const button = screen.getByRole('button', { name: /cargando/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
