import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { FloatingCalculator } from './FloatingCalculator';

async function openCalculator() {
  const user = userEvent.setup();
  render(<FloatingCalculator />);

  await user.click(screen.getByRole('button', { name: 'Abrir calculadora' }));

  const dialog = await screen.findByRole('dialog', { name: 'Calculadora' });
  return { user, dialog };
}

describe('FloatingCalculator', () => {
  it('opens, computes a basic operation, and closes', async () => {
    const { user, dialog } = await openCalculator();

    expect(within(dialog).getByLabelText('Resultado')).toHaveTextContent('0');

    await user.click(within(dialog).getByRole('button', { name: '1' }));
    await user.click(within(dialog).getByRole('button', { name: '2' }));
    await user.click(within(dialog).getByRole('button', { name: 'Sumar' }));
    await user.click(within(dialog).getByRole('button', { name: '8' }));
    await user.click(within(dialog).getByRole('button', { name: 'Igual' }));

    expect(within(dialog).getByLabelText('Resultado')).toHaveTextContent('20');

    await user.click(within(dialog).getByRole('button', { name: 'Cerrar calculadora' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Calculadora' })).not.toBeInTheDocument(),
    );
  });

  it('supports the physical keyboard', async () => {
    const { user, dialog } = await openCalculator();

    await user.keyboard('7*6{Enter}');

    expect(within(dialog).getByLabelText('Resultado')).toHaveTextContent('42');

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Calculadora' })).not.toBeInTheDocument(),
    );
  });

  it('shows the error message for a division by zero', async () => {
    const { user, dialog } = await openCalculator();

    await user.click(within(dialog).getByRole('button', { name: '8' }));
    await user.click(within(dialog).getByRole('button', { name: 'Dividir' }));
    await user.click(within(dialog).getByRole('button', { name: '0' }));
    await user.click(within(dialog).getByRole('button', { name: 'Igual' }));

    expect(within(dialog).getByLabelText('Resultado')).toHaveTextContent('Error');
    expect(within(dialog).getByRole('alert')).toHaveTextContent('No se puede dividir por cero.');
  });
});
