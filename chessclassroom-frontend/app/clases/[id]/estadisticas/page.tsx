'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, TrendingUp, Target, Clock, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, Cell } from 'recharts';

const API = `${process.env.NEXT_PUBLIC_API_URL}`;

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}
function getUsuario(): any {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem('usuario') ?? '{}'); } catch { return {}; }
}

const CATEGORIAS_LABELS: Record<string, string> = {
  tactica: 'Táctica', calculo: 'Cálculo', apertura: 'Apertura',
  estrategia: 'Estrategia', final: 'Final', partida: 'Partida',
};
const CATEGORIAS_COLORES: Record<string, string> = {
  tactica: '#ef4444', calculo: '#f97316', apertura: '#8b5cf6',
  estrategia: '#3b82f6', final: '#10b981', partida: '#f59e0b',
};

function formatTiempo(segundos: number): string {
  if (segundos < 60) return `${segundos}s`;
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function EstadisticasPage() {
  const params  = useParams();
  const router  = useRouter();
  const claseId = params.id as string;

  const [usuario, setUsuario]       = useState<any>(null);
  const [esProfesor, setEsProfesor] = useState(false);
  const [alumnos, setAlumnos]       = useState<any[]>([]);
  const [alumnoSel, setAlumnoSel]   = useState<string>('');
  const [datos, setDatos]           = useState<any>(null);
  const [cargando, setCargando]     = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    const u = getUsuario();
    setUsuario(u);
    setEsProfesor(u?.rol === 'profesor');
  }, []);

  // Cargar alumnos (solo profesor)
  useEffect(() => {
    if (!esProfesor || !claseId) return;
    fetch(`${API}/datos/alumnos/${claseId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setAlumnos(d.alumnos ?? []);
          if (d.alumnos?.length > 0) setAlumnoSel(d.alumnos[0].alumno_id);
        }
      })
      .catch(() => {});
  }, [esProfesor, claseId]);

  // Para alumno: usar su propio ID
  useEffect(() => {
    if (!esProfesor && usuario?.id) setAlumnoSel(usuario.id);
  }, [esProfesor, usuario]);

  const cargarDatos = useCallback(async () => {
    if (!alumnoSel || !claseId) return;
    setCargando(true); setError('');
    try {
      const res = await fetch(`${API}/datos/ejercicios/${alumnoSel}?clase_id=${claseId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      setDatos(d.datos);
    } catch (e: any) { setError(e.message); }
    finally { setCargando(false); }
  }, [alumnoSel, claseId]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const categoriasFiltradas = datos?.porCategoria?.filter((c: any) => c.total > 0) ?? [];
  const datosRadar = categoriasFiltradas.map((c: any) => ({
    categoria: CATEGORIAS_LABELS[c.categoria] ?? c.categoria,
    valor: c.tasaExito,
    fullMark: 100,
  }));

  const alumnoNombre = esProfesor
    ? alumnos.find(a => a.alumno_id === alumnoSel)?.usuarios?.nombre ?? 'Alumno'
    : usuario?.nombre ?? 'Tú';

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">

        {/* Cabecera */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm text-slate-600 shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-purple-600" /> Datos y Rendimiento
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">Estadísticas de ejercicios</p>
            </div>
          </div>

          {/* Selector de alumno (solo profesor) */}
          {esProfesor && alumnos.length > 0 && (
            <div className="relative">
              <select
                value={alumnoSel}
                onChange={e => setAlumnoSel(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
              >
                {alumnos.map(a => (
                  <option key={a.alumno_id} value={a.alumno_id}>
                    {a.alias ?? a.usuarios?.nombre ?? 'Alumno'}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {cargando ? (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-medium">Cargando estadísticas...</span>
          </div>
        ) : !datos || categoriasFiltradas.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-slate-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">Sin datos todavía</p>
              <p className="text-sm text-slate-400 mt-1">
                {esProfesor ? 'Este alumno' : 'Tú'} aún no {esProfesor ? 'ha' : 'has'} completado ningún ejercicio en esta clase.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Título del alumno */}
            <p className="text-slate-500 text-sm font-medium">
              Mostrando datos de <span className="text-slate-900 font-bold">{alumnoNombre}</span>
            </p>

            {/* Tarjetas resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: 'Ejercicios asignados',
                  valor: categoriasFiltradas.reduce((s: number, c: any) => s + c.total, 0),
                  icono: <Target className="w-5 h-5 text-purple-500" />,
                  bg: 'bg-purple-50',
                },
                {
                  label: 'Completados',
                  valor: categoriasFiltradas.reduce((s: number, c: any) => s + c.completados, 0),
                  icono: <TrendingUp className="w-5 h-5 text-emerald-500" />,
                  bg: 'bg-emerald-50',
                },
                {
                  label: 'Tasa de éxito global',
                  valor: (() => {
                    const total = categoriasFiltradas.reduce((s: number, c: any) => s + c.total, 0);
                    const comp  = categoriasFiltradas.reduce((s: number, c: any) => s + c.completados, 0);
                    return total > 0 ? `${Math.round((comp / total) * 100)}%` : '—';
                  })(),
                  icono: <BarChart3 className="w-5 h-5 text-blue-500" />,
                  bg: 'bg-blue-50',
                },
                {
                  label: 'Tiempo medio',
                  valor: (() => {
                    const tiempos = categoriasFiltradas.filter((c: any) => c.tiempoMedio > 0).map((c: any) => c.tiempoMedio);
                    return tiempos.length > 0 ? formatTiempo(Math.round(tiempos.reduce((a: number, b: number) => a + b, 0) / tiempos.length)) : '—';
                  })(),
                  icono: <Clock className="w-5 h-5 text-amber-500" />,
                  bg: 'bg-amber-50',
                },
              ].map((t, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <div className={`w-9 h-9 ${t.bg} rounded-xl flex items-center justify-center mb-3`}>
                    {t.icono}
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900">{t.valor}</p>
                  <p className="text-xs text-slate-500 mt-1">{t.label}</p>
                </div>
              ))}
            </div>

            {/* Gráficos — fila superior */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Radar de tasa de éxito */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-slate-800 mb-1">Tasa de éxito por categoría</h2>
                <p className="text-xs text-slate-400 mb-6">Porcentaje de ejercicios completados en cada área</p>
                {datosRadar.length >= 3 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={datosRadar}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="categoria" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                      <Radar
                        name="Tasa de éxito"
                        dataKey="valor"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                      <Tooltip formatter={(v: any) => [`${v}%`, 'Tasa de éxito']} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-slate-400 text-sm">Se necesitan al menos 3 categorías para el radar.</p>
                      <p className="text-slate-400 text-xs mt-1">Mostrando datos disponibles abajo.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Barras de tiempo medio */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-slate-800 mb-1">Tiempo medio de resolución</h2>
                <p className="text-xs text-slate-400 mb-6">Segundos promedio en completar ejercicios por área</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={categoriasFiltradas.filter((c: any) => c.tiempoMedio > 0).map((c: any) => ({
                      name: CATEGORIAS_LABELS[c.categoria] ?? c.categoria,
                      tiempo: c.tiempoMedio,
                      color: CATEGORIAS_COLORES[c.categoria] ?? '#8b5cf6',
                    }))}
                    layout="vertical"
                    margin={{ left: 10, right: 20 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${v}s`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} width={80} />
                    <Tooltip formatter={(v: any) => [formatTiempo(v), 'Tiempo medio']} />
                    <Bar dataKey="tiempo" radius={[0, 6, 6, 0]}>
                      {categoriasFiltradas.filter((c: any) => c.tiempoMedio > 0).map((c: any, i: number) => (
                        <Cell key={i} fill={CATEGORIAS_COLORES[c.categoria] ?? '#8b5cf6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Evolución semanal */}
            {datos.evolucionSemanal?.some((s: any) => s.total > 0) && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-slate-800 mb-1">Evolución semanal</h2>
                <p className="text-xs text-slate-400 mb-6">Tasa de éxito por semana en las últimas 8 semanas</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={datos.evolucionSemanal} margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="semanaLabel" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip formatter={(v: any) => [`${v}%`, 'Tasa de éxito']} />
                    <Line
                      type="monotone"
                      dataKey="tasa"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      dot={{ fill: '#8b5cf6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tabla resumen por categoría */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h2 className="font-bold text-slate-800">Desglose por categoría</h2>
                <p className="text-xs text-slate-400 mt-0.5">Detalle completo de rendimiento en cada área</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Completados</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tasa éxito</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tiempo medio</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Intentos fallidos</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Puntuación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categoriasFiltradas.map((c: any) => (
                      <tr key={c.categoria} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: CATEGORIAS_COLORES[c.categoria] ?? '#8b5cf6' }}
                            />
                            <span className="font-semibold text-slate-800">
                              {CATEGORIAS_LABELS[c.categoria] ?? c.categoria}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-slate-600">{c.total}</td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-emerald-600 font-semibold">{c.completados}</span>
                          {c.enProgreso > 0 && <span className="text-slate-400 text-xs ml-1">(+{c.enProgreso} en progreso)</span>}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${c.tasaExito}%`,
                                  backgroundColor: CATEGORIAS_COLORES[c.categoria] ?? '#8b5cf6',
                                }}
                              />
                            </div>
                            <span className="font-bold text-slate-800 text-xs w-8">{c.tasaExito}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-slate-600">
                          {c.tiempoMedio > 0 ? formatTiempo(c.tiempoMedio) : '—'}
                        </td>
                        <td className="px-4 py-4 text-center text-slate-600">{c.intentosMedio}</td>
                        <td className="px-4 py-4 text-center">
                          {c.puntuacionMedia !== null ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold">
                              ★ {c.puntuacionMedia}/5
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">Sin eval.</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}