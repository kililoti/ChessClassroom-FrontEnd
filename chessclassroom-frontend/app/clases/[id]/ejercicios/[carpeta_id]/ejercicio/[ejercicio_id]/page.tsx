'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VisorEjercicio, { ProgresoAlumno } from '@/components/ajedrez/VisorEjercicio';

const API_EJ  = 'http://localhost:3001/api/ejercicios';
const API_REC = 'http://localhost:3001/api/recursos';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}
function getUsuario(): any {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('usuario') ?? '{}'); } catch { return {}; }
}

export default function EjercicioPage() {
  const params      = useParams();
  const router      = useRouter();
  const claseId     = params.id as string;
  const carpetaId   = params.carpeta_id as string;
  const ejercicioId = params.ejercicio_id as string;

  const [props, setProps]     = useState<any | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError]     = useState('');

  const usuario    = getUsuario();
  const esProfesor = usuario?.rol === 'profesor';

  useEffect(() => { cargar(); }, [ejercicioId]);

  const cargar = async () => {
    setCargando(true);
    try {
      const h = { Authorization: `Bearer ${getToken()}` };

      // Datos del ejercicio
      const resEj = await fetch(`${API_EJ}/${ejercicioId}`, { headers: h });
      const datEj = await resEj.json();
      if (!resEj.ok) throw new Error(datEj.error);
      const config = datEj.ejercicio.ejercicio_config;

      // Iniciar o recuperar progreso del alumno
      let progreso: ProgresoAlumno | undefined;
      if (!esProfesor) {
        const res = await fetch(`${API_EJ}/${ejercicioId}/iniciar`, { method: 'POST', headers: h });
        const d   = await res.json();
        if (d.success) progreso = d.respuesta;
      }

      // PGN inicial del archivo
      let pgnInicial = '';
      const resDesc = await fetch(`${API_REC}/descargar/${ejercicioId}`, { headers: h });
      const datDesc = await resDesc.json();
      if (resDesc.ok && datDesc.url) {
        const fileRes = await fetch(datDesc.url);
        pgnInicial = (await fileRes.text()).trim();
      }

      setProps({
        ejercicioId,
        esProfesor,
        pgnInicial:            progreso?.pgn_avanzado_correcto ?? pgnInicial,
        solucionPgn:           config.solucion_pgn ?? undefined,
        comentarioSolucion:    config.comentarios_solucion ?? undefined,
        progreso,
        fechaEntrega:          config.fecha_entrega ?? null,
        asignado:              config.asignado,
      });
    } catch (e: any) { setError(e.message); }
    finally { setCargando(false); }
  };

  if (cargando) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-slate-500 animate-pulse font-medium">Cargando ejercicio...</div>
    </div>
  );

  if (error || !props) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-red-500">{error || 'Ejercicio no encontrado'}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <VisorEjercicio
        {...props}
        onClose={() => router.push(`/clases/${claseId}/ejercicios/${carpetaId}`)}
      />
    </div>
  );
}