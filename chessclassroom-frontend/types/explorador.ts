// Tipos compartidos por todos los componentes del explorador

export type Categoria = 'apertura' | 'tactica' | 'estrategia' | 'final' | 'partida' | 'calculo';

export interface Carpeta {
  id: string;
  nombre: string;
  profesor_id: string;
  clase_id: string;
  carpeta_padre_id: string | null;
  visible: boolean;
  created_at: string;
  usuarios?: { nombre: string; apellidos: string };
}

export interface Archivo {
  id: string;
  nombre: string;
  carpeta_id: string;
  profesor_id: string;
  categoria: Categoria;
  storage_path: string;
  visible: boolean;
  created_at: string;
  usuarios?: { nombre: string; apellidos: string };
  metadata_ejercicio?: MetadataEjercicio;
  metadata: {
    es_base_datos: boolean;
    total_partidas: number;
    partidas: {
      index: number;
      blancas: string;
      negras: string;
      resultado: string;
      fecha: string;
      evento: string;
    }[];
  };
}

export const CATEGORIA_LABELS: Record<Categoria, { label: string; color: string }> = {
  apertura:   { label: 'Apertura',   color: 'bg-violet-100 text-violet-700' },
  tactica:    { label: 'Táctica',    color: 'bg-red-100 text-red-700' },
  estrategia: { label: 'Estrategia', color: 'bg-blue-100 text-blue-700' },
  final:      { label: 'Final',      color: 'bg-amber-100 text-amber-700' },
  partida:    { label: 'Partida',    color: 'bg-emerald-100 text-emerald-700' },
  calculo:  { label: 'Cálculo',    color: 'bg-gray-100 text-gray-700' },
};

export function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function nombreProfesor(u?: { nombre: string; apellidos: string }) {
  return u ? `${u.nombre} ${u.apellidos}` : 'Profesor';
}

export type EstadoEjercicio = 'NO_INICIADO' | 'EN_PROGRESO' | 'COMPLETADO';

export interface MetadataEjercicio {
  id_ejercicio?: string;
  partida_index?: number; 
  fecha_inicio?: string | null;
  fecha_entrega?: string | null;
  solucion_pgn?: string | null;
  estado_alumno?: EstadoEjercicio;
  puntuacion_alumno?: number | null;
}