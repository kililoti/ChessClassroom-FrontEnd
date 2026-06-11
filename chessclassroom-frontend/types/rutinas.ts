export interface EventoCalendario {
  id: string;
  clase_id: string;
  alumno_id: string | null;
  titulo: string;
  tipo: 'clase' | 'torneo' | 'deberes';
  fecha_inicio: string;
  fecha_fin: string | null;
  deadline: string | null;
  se_repite: boolean;
  rango_inicio: string | null;
  rango_fin: string | null;
  dias_semana: number[] | null;
  origen_grupal: boolean;
  creado_en: string;
}

export interface RutinaChecklist {
  id: string;
  clase_id: string;
  alumno_id: string | null;
  titulo: string;
  origen_grupal: boolean;
  creado_en: string;
  semana?: SemanaRutina;
}

export interface SemanaRutina {
  id: string;
  rutina_id: string;
  alumno_id: string;
  semana_inicio: string;
  completado: boolean;
  completado_en: string | null;
}

export interface Notificacion {
  id: string;
  usuario_id: string;
  titulo: string;
  mensaje: string;
  tipo: 'clase' | 'torneo' | 'deberes' | 'rutina';
  leida: boolean;
  evento_id: string | null;
  creado_en: string;
}