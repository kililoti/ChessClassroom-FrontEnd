export interface Objetivo {
  id: string;
  tablon_id: string;
  titulo: string;
  fecha_limite: string | null;
  completado: boolean;
  completado_en: string | null;
  creado_en: string;
}

export interface TablonObjetivos {
  id: string;
  clase_id: string;
  alumno_id: string | null;
  titulo: string;
  descripcion: string | null;
  fecha_limite: string | null;
  origen_grupal: boolean; // ← nuevo
  creado_por: string;
  creado_en: string;
  objetivos: Objetivo[];
}