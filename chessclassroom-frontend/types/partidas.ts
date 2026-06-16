export interface Partida {
  id: string;
  estado: 'esperando' | 'iniciada' | 'finalizada' | 'abortada';
  resultado: string | null;
  motivo_fin: string | null;
  tiempo_blancas_ms: number;
  tiempo_negras_ms: number;
  incremento_ms: number;
  created_at: string;
  finalizada_at: string | null;
  jugador_blancas_id: string | null;
  jugador_negras_id: string | null;
  blancas: { id: string; nombre: string; apellidos: string } | null;
  negras:  { id: string; nombre: string; apellidos: string } | null;
  creador: { id: string; nombre: string; apellidos: string };
}

export interface Torneo {
  id: string;
  nombre: string;
  estado: 'configurando' | 'programado' | 'activo' | 'finalizado';
  fecha_inicio: string | null;
  fecha_fin: string | null;
  tiempo_ms: number;
  incremento_ms: number;
  creador_id: string;
  creador: { id: string; nombre: string; apellidos: string };
  torneo_participantes: { usuario_id: string }[];
}