import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { Settings } from '@/domain/models';
import type { ThemePreference } from '@/hooks/useTheme';

export interface ProfileSectionProps {
  settings: Settings;
  theme: ThemePreference;
  onSaveName: (name: string) => Promise<void>;
  onThemeChange: (theme: ThemePreference) => Promise<void>;
}

export function ProfileSection({ settings, theme, onSaveName, onThemeChange }: ProfileSectionProps) {
  const [name, setName] = useState(settings.displayName ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await onSaveName(name.trim());
      setMessage('Perfil guardado.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">Perfil</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Tu nombre se usa para saludarte en Inicio. Todo queda en este dispositivo.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label htmlFor="settings-name" className="mb-1 block text-sm font-medium text-ink">
            Nombre
          </label>
          <Input
            id="settings-name"
            value={name}
            maxLength={60}
            placeholder="Cómo te llamás"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <Button onClick={() => void save()} loading={saving} disabled={name.trim().length === 0}>
          Guardar perfil
        </Button>
      </div>

      <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
        <div>
          <label htmlFor="settings-theme" className="mb-1 block text-sm font-medium text-ink">
            Tema
          </label>
          <Select
            id="settings-theme"
            value={theme}
            onChange={(event) => void onThemeChange(event.target.value as ThemePreference)}
          >
            <option value="system">Sistema</option>
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
          </Select>
        </div>
        <div>
          <label htmlFor="settings-currency" className="mb-1 block text-sm font-medium text-ink">
            Moneda
          </label>
          <Input id="settings-currency" value="PEN — Sol peruano" readOnly disabled />
        </div>
        <div>
          <label htmlFor="settings-timezone" className="mb-1 block text-sm font-medium text-ink">
            Zona horaria
          </label>
          <Input id="settings-timezone" value="America/Lima" readOnly disabled />
        </div>
      </div>

      {message ? (
        <p role="status" className="text-sm text-ink-muted">
          {message}
        </p>
      ) : null}
    </Card>
  );
}
