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

// Extrae la partida N de un PGN multi-partida
function extraerPartidaDePgn(pgnCompleto: string, partidaIndex: number): string {
  const bloques = pgnCompleto.split(/(?=\[Event\s)/g).filter(b => b.trim().length > 0);
  return bloques[partidaIndex] ?? bloques[0] ?? pgnCompleto;
}

export default function EjercicioPage() {
  const params = useParams();
  const router = useRouter();
  const claseId = params.id as string;
  const carpetaId = params.carpeta_id as string;
  const ejercicioId = params.ejercicio_id as string;

  const [props, setProps] = useState<any | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const usuario = getUsuario();
  const esProfesor = usuario?.rol === 'profesor';

  useEffect(() => { cargar(); }, [ejercicioId]);

  const cargar = async () => {
    setCargando(true);
    try {
      const h = { Authorization: `Bearer ${getToken()}` };

      // Datos del ejercicio (incluye partida_index y archivo_id)
      const resEj = await fetch(`${API_EJ}/${ejercicioId}`, { headers: h });
      const datEj = await resEj.json();
      if (!resEj.ok) throw new Error(datEj.error);

      const config = datEj.ejercicio.ejercicio_config;
      const archivoId = datEj.ejercicio.archivo_id;
      const esDatabaseEj = datEj.ejercicio.metadata?.es_base_datos === true;

      // Iniciar o recuperar progreso del alumno
      let progreso: ProgresoAlumno | undefined;
      if (!esProfesor) {
        const res = await fetch(`${API_EJ}/${ejercicioId}/iniciar`, { method: 'POST', headers: h });
        const d   = await res.json();
        if (d.success) progreso = d.respuesta;
      }

      let pgnInicial = '';
      const resDesc = await fetch(`${API_REC}/descargar/${archivoId}`, { headers: h });
      const datDesc = await resDesc.json();
      if (resDesc.ok && datDesc.url) {
        const pgnCompleto = (await fetch(datDesc.url).then(r => r.text())).trim();
        pgnInicial = extraerPartidaDePgn(pgnCompleto, config.partida_index ?? 0);
      }

      setProps({
        ejercicioId,
        esProfesor,
        pgnInicial:         progreso?.pgn_avanzado_correcto ?? pgnInicial,
        pgnBase:            pgnInicial,
        solucionPgn:        config.solucion_pgn ?? undefined,
        comentarioSolucion: config.comentarios_solucion ?? undefined,
        progreso,
        fechaEntrega:       config.fecha_entrega ?? null,
        asignado:           config.asignado,
        // Para saber a dónde volver al cerrar
        _archivoId:         archivoId,
        _esDatabaseEj:      esDatabaseEj,
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
        onClose={() => {
          if (props._esDatabaseEj) {
            router.push(`/clases/${claseId}/ejercicios/${carpetaId}/db/${props._archivoId}`);
          } else {
            router.push(`/clases/${claseId}/ejercicios/${carpetaId}`);
          }
        }}
      />
    </div>
  );
}