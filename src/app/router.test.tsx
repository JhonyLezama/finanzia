import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { createTestRouter } from './router';

describe('router', () => {
  it('navigates between primary destinations and marks the active one', async () => {
    render(<RouterProvider router={createTestRouter()} />);

    await userEvent.click(screen.getByRole('link', { name: 'Presupuesto' }));

    expect(await screen.findByRole('heading', { name: /presupuesto/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Presupuesto' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
