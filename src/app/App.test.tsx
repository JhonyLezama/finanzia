import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the Finanzia shell', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Finanzia' })).toBeInTheDocument();
  });
});
