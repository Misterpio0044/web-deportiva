import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ActivitiesPage } from '../ActivitiesPage';
import { useAuthStore } from '../../../application/auth/useAuthStore';

vi.mock('../../../infrastructure/api/activitiesApi', () => ({
  activitiesApi: {
    list: vi.fn(),
    exportOne: vi.fn(),
    exportMany: vi.fn(),
  },
}));

vi.mock('../../../infrastructure/api/athletesApi', () => ({
  athletesApi: { list: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../../lib/downloadBlob', () => ({
  downloadBlob: vi.fn(),
}));

import { activitiesApi } from '../../../infrastructure/api/activitiesApi';
import { downloadBlob } from '../../../lib/downloadBlob';

const fakeActivities = [
  {
    id: 1,
    athleteId: 1,
    name: 'Rodaje 1',
    sportType: 'Run',
    startDate: '2024-05-20T08:30:00Z',
    startDateLocal: '2024-05-20T08:30:00Z',
    timezone: 'Europe/Madrid',
    distance: 5000,
    movingTime: 1500,
    elapsedTime: 1500,
    hasHeartrate: false,
    trainer: false,
    commute: false,
    createdAt: '2024-05-20T09:00:00Z',
  },
  {
    id: 2,
    athleteId: 1,
    name: 'Rodaje 2',
    sportType: 'Run',
    startDate: '2024-05-21T08:30:00Z',
    startDateLocal: '2024-05-21T08:30:00Z',
    timezone: 'Europe/Madrid',
    distance: 8000,
    movingTime: 2400,
    elapsedTime: 2400,
    hasHeartrate: false,
    trainer: false,
    commute: false,
    createdAt: '2024-05-21T09:00:00Z',
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <ActivitiesPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  (activitiesApi.list as ReturnType<typeof vi.fn>).mockResolvedValue(fakeActivities);
  useAuthStore.setState({
    token: 't',
    user: { id: 1, email: 'a@b.c', role: 'user', firstname: 'A', lastname: 'B' },
    isAuthenticated: true,
  });
});

describe('ActivitiesPage — modo selección y exportación GPX', () => {
  it('no muestra checkboxes hasta entrar en modo selección', async () => {
    renderPage();
    await screen.findByText('Rodaje 1');
    expect(screen.queryByLabelText(/Seleccionar actividad/)).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /Exportar GPX/i }));
    expect(screen.getAllByLabelText(/Seleccionar actividad/)).toHaveLength(2);
  });

  it('"Seleccionar todas" marca todas las filas visibles', async () => {
    renderPage();
    await screen.findByText('Rodaje 1');
    await userEvent.click(screen.getByRole('button', { name: /Exportar GPX/i }));
    await userEvent.click(screen.getByRole('button', { name: /Seleccionar todas/i }));

    const checkboxes = screen.getAllByLabelText(/Seleccionar actividad/) as HTMLInputElement[];
    expect(checkboxes.every((c) => c.checked)).toBe(true);
    expect(screen.getByText(/2 seleccionadas/i)).toBeInTheDocument();
  });

  it('descarga un único GPX cuando solo hay 1 seleccionada', async () => {
    (activitiesApi.exportOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      blob: new Blob(['<gpx/>']),
      filename: '2024-05-20_rodaje-1.gpx',
    });
    renderPage();
    await screen.findByText('Rodaje 1');
    await userEvent.click(screen.getByRole('button', { name: /Exportar GPX/i }));
    await userEvent.click(screen.getByLabelText('Seleccionar actividad Rodaje 1'));
    await userEvent.click(screen.getByRole('button', { name: /Descargar GPX/i }));

    await waitFor(() => {
      expect(activitiesApi.exportOne).toHaveBeenCalledWith(1);
      expect(activitiesApi.exportMany).not.toHaveBeenCalled();
      expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), '2024-05-20_rodaje-1.gpx');
    });
  });

  it('descarga un ZIP cuando hay varias seleccionadas', async () => {
    (activitiesApi.exportMany as ReturnType<typeof vi.fn>).mockResolvedValue({
      blob: new Blob(['PK']),
      filename: 'actividades.zip',
    });
    renderPage();
    await screen.findByText('Rodaje 1');
    await userEvent.click(screen.getByRole('button', { name: /Exportar GPX/i }));
    await userEvent.click(screen.getByRole('button', { name: /Seleccionar todas/i }));
    await userEvent.click(screen.getByRole('button', { name: /Descargar GPX/i }));

    await waitFor(() => {
      expect(activitiesApi.exportMany).toHaveBeenCalledWith([1, 2]);
      expect(activitiesApi.exportOne).not.toHaveBeenCalled();
      expect(downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'actividades.zip');
    });
  });

  it('"Cancelar" sale del modo selección y limpia las marcas', async () => {
    renderPage();
    await screen.findByText('Rodaje 1');
    await userEvent.click(screen.getByRole('button', { name: /Exportar GPX/i }));
    await userEvent.click(screen.getByLabelText('Seleccionar actividad Rodaje 1'));
    await userEvent.click(screen.getByRole('button', { name: /Cancelar/i }));

    expect(screen.queryByLabelText(/Seleccionar actividad/)).toBeNull();
    expect(screen.getByRole('button', { name: /Exportar GPX/i })).toBeInTheDocument();
  });

  it('muestra mensaje de error si la exportación falla', async () => {
    (activitiesApi.exportMany as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    renderPage();
    await screen.findByText('Rodaje 1');
    await userEvent.click(screen.getByRole('button', { name: /Exportar GPX/i }));
    await userEvent.click(screen.getByRole('button', { name: /Seleccionar todas/i }));
    await userEvent.click(screen.getByRole('button', { name: /Descargar GPX/i }));

    expect(await screen.findByText(/No se pudo completar la exportación/i)).toBeInTheDocument();
  });
});
