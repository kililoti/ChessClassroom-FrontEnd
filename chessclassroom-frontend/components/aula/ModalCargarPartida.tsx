'use client';

import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertTriangle, Loader2, ClipboardPaste, FolderOpen, ChevronRight, ArrowLeft } from 'lucide-react';
import { Chess } from 'chess.js';

const API = 'http://localhost:3001/api/recursos';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
}

function extraerPartidaDePgn(pgnCompleto: string, partidaIndex: number): string {
  const bloques = pgnCompleto.split(/(?=\[Event\s)/g).filter(b => b.trim().length > 0);
  return bloques[partidaIndex] ?? bloques[0] ?? pgnCompleto;
}

function esDatabase(texto: string): boolean {
  const bloques = texto.split(/(?=\[Event\s)/g).filter(b => b.trim().length > 0);
  return bloques.length > 1;
}

type Vista = 'principal' | 'explorador';

interface Carpeta {
  id: string;
  nombre: string;
  visible: boolean;
}

interface Archivo {
  id: string;
  nombre: string;
  metadata: {
    es_base_datos: boolean;
    total_partidas: number;
    partidas: { index: number; blancas: string; negras: string; resultado: string }[];
  };
}

interface Props {
  claseId: string;
  onClose: () => void;
  onCargar: (pgn: string) => void;
}

export default function ModalCargarPartida({ claseId, onClose, onCargar }: Props) {
  const [vista, setVista] = useState<Vista>('principal');
  const [textoFenPgn, setTextoFenPgn] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Explorador
  const [modulo, setModulo] = useState<'estudio' | 'ejercicio'>('estudio');
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [carpetaActual, setCarpetaActual] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; nombre: string }[]>([]);
  const [databaseActual, setDatabaseActual] = useState<Archivo | null>(null);
  const [cargandoExplorador, setCargandoExplorador] = useState(false);

  const tieneTexto   = textoFenPgn.trim().length > 0;
  const tieneArchivo = !!archivo;
  const hayConflicto = tieneTexto && tieneArchivo;
  const puedeCargar  = !hayConflicto && (tieneTexto || tieneArchivo);

  const handleCargarTexto = () => {
    setError('');
    const texto = textoFenPgn.trim();

    // Comprobar si es una database (múltiples partidas)
    if (esDatabase(texto)) {
      setError('No se puede cargar un PGN con múltiples partidas. Usa el explorador de archivos para seleccionar una partida individual.');
      return;
    }

    const g = new Chess();
    try { g.loadPgn(texto); onCargar(g.pgn()); onClose(); return; } catch {}
    try { g.load(texto); onCargar(`[FEN "${texto}"]\n\n`); onClose(); return; } catch {}
    setError('El texto no es un FEN ni un PGN válido.');
  };

  const handleCargarArchivo = async () => {
    if (!archivo) return;
    setLoadingId('archivo'); setError('');
    try {
      const texto = await archivo.text();

      // Comprobar si es una database
      if (esDatabase(texto)) {
        setError('No se puede cargar un PGN con múltiples partidas. Usa el explorador de archivos para seleccionar una partida individual.');
        return;
      }

      const g = new Chess();
      try { g.loadPgn(texto); onCargar(g.pgn()); onClose(); return; } catch {}
      try { g.load(texto); onCargar(`[FEN "${texto.trim()}"]\n\n`); onClose(); return; } catch {}
      throw new Error('El archivo no contiene un PGN o FEN válido.');
    } catch (e: any) { setError(e.message); }
    finally { setLoadingId(null); }
  };

  const handleCargar = () => {
    if (tieneArchivo) handleCargarArchivo();
    else if (tieneTexto) handleCargarTexto();
  };

  const cargarExplorador = async (carpetaId: string | null, mod: 'estudio' | 'ejercicio') => {
    setCargandoExplorador(true); setError('');
    try {
      const h = { Authorization: `Bearer ${getToken()}` };
      const urlC = `${API}/carpetas?clase_id=${claseId}&modulo=${mod}${carpetaId ? `&carpeta_padre_id=${carpetaId}` : ''}`;
      const [resC, resA] = await Promise.all([
        fetch(urlC, { headers: h }),
        carpetaId ? fetch(`${API}/archivos/carpeta/${carpetaId}?modulo=${mod}`, { headers: h }) : Promise.resolve(null)
      ]);
      const datC = await resC.json();
      setCarpetas(datC.carpetas ?? []);
      if (resA) {
        const datA = await resA.json();
        setArchivos(datA.archivos ?? []);
      } else {
        setArchivos([]);
      }
    } catch (e: any) { setError(e.message); }
    finally { setCargandoExplorador(false); }
  };

  const abrirExplorador = (mod: 'estudio' | 'ejercicio') => {
    setModulo(mod);
    setCarpetaActual(null);
    setBreadcrumbs([]);
    setDatabaseActual(null);
    setVista('explorador');
    cargarExplorador(null, mod);
  };

  const entrarCarpeta = (carpeta: Carpeta) => {
    setDatabaseActual(null);
    setCarpetaActual(carpeta.id);
    setBreadcrumbs(prev => [...prev, { id: carpeta.id, nombre: carpeta.nombre }]);
    cargarExplorador(carpeta.id, modulo);
  };

  const navegarBreadcrumb = (index: number) => {
    const bc = breadcrumbs[index];
    setBreadcrumbs(prev => prev.slice(0, index + 1));
    setCarpetaActual(bc.id);
    setDatabaseActual(null);
    cargarExplorador(bc.id, modulo);
  };

  const navegarRaiz = () => {
    setBreadcrumbs([]);
    setCarpetaActual(null);
    setDatabaseActual(null);
    cargarExplorador(null, modulo);
  };

  const cargarPartidaDeArchivo = async (archivoId: string, partidaIndex?: number) => {
    const key = partidaIndex !== undefined ? `${archivoId}-${partidaIndex}` : archivoId;
    setLoadingId(key); setError('');
    try {
      const res = await fetch(`${API}/descargar/${archivoId}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const fileRes = await fetch(data.url);
      const texto = await fileRes.text();

      const g = new Chess();
      const pgn = partidaIndex !== undefined
        ? extraerPartidaDePgn(texto, partidaIndex)
        : texto.trim();

      try { g.loadPgn(pgn); } catch {
        throw new Error('No se pudo parsear la partida. Verifica que el PGN sea válido.');
      }

      onCargar(g.pgn());
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setLoadingId(null); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Cabecera */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            {vista === 'explorador' && (
              <button onClick={() => setVista('principal')} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h3 className="text-lg font-bold text-slate-900">
              {vista === 'principal' ? 'Cargar partida' : `Mis ${modulo === 'estudio' ? 'estudios' : 'ejercicios'}`}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {/* Vista principal */}
        {vista === 'principal' && (
          <div className="flex flex-col gap-5 overflow-y-auto flex-1">

            {hayConflicto && (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Tienes un archivo seleccionado <strong>y</strong> texto pegado. Usa solo uno.</span>
              </div>
            )}

            {/* Opción A: archivo */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 block">
                Opción A — Archivo PGN / FEN
              </label>
              <div
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  tieneArchivo
                    ? hayConflicto ? 'border-amber-400 bg-amber-50' : 'border-blue-400 bg-blue-50'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
              >
                {tieneArchivo ? (
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-600">{archivo.name}</span>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setArchivo(null); }} className="text-slate-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="w-6 h-6 text-slate-400" />
                    <p className="text-sm text-slate-500">Haz clic para seleccionar un archivo <span className="font-semibold">.pgn</span></p>
                    <p className="text-xs text-slate-400">Solo partidas individuales</p>
                  </div>
                )}
              </div>
              <input ref={inputRef} type="file" accept=".pgn,.fen" className="hidden"
                onChange={e => { setArchivo(e.target.files?.[0] ?? null); setError(''); e.target.value = ''; }} />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">o</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Opción B: texto FEN/PGN */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <ClipboardPaste className="w-3.5 h-3.5" /> Opción B — Pegar FEN o PGN
              </label>
              <textarea
                rows={4}
                className={`w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-xs font-mono resize-none transition-all ${
                  tieneTexto && hayConflicto ? 'border-amber-400 bg-amber-50' : 'border-slate-300'
                }`}
                value={textoFenPgn}
                onChange={e => { setTextoFenPgn(e.target.value); setError(''); }}
                placeholder={'FEN: rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1\n\no PGN: 1. e4 e5 2. Nf3 ...'}
              />
              <p className="text-xs text-slate-400 mt-1">Solo partidas individuales — para databases usa el explorador</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">o</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Opción C: explorador */}
            <div>
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5" /> Opción C — Desde mis archivos
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => abrirExplorador('estudio')}
                  className="flex items-center gap-2 p-3 border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition-all text-sm font-semibold text-slate-700 cursor-pointer"
                >
                  <span className="text-lg">📚</span> Estudios
                </button>
                <button
                  onClick={() => abrirExplorador('ejercicio')}
                  className="flex items-center gap-2 p-3 border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-xl transition-all text-sm font-semibold text-slate-700 cursor-pointer"
                >
                  <span className="text-lg">🧩</span> Ejercicios
                </button>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-2 justify-end pt-2 shrink-0">
              <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm transition-colors cursor-pointer">
                Cancelar
              </button>
              <button
                onClick={handleCargar}
                disabled={!puedeCargar || loadingId !== null}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {loadingId === 'archivo' && <Loader2 className="w-4 h-4 animate-spin" />}
                Cargar partida
              </button>
            </div>
          </div>
        )}

        {/* Vista explorador */}
        {vista === 'explorador' && (
          <div className="flex flex-col flex-1 overflow-hidden">

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1 text-sm text-slate-500 font-medium mb-4 flex-wrap shrink-0">
              <button onClick={navegarRaiz} className="hover:text-blue-600 transition-colors cursor-pointer">Raíz</button>
              {breadcrumbs.map((bc, i) => (
                <span key={bc.id} className="flex items-center gap-1">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <button onClick={() => navegarBreadcrumb(i)} className="hover:text-blue-600 transition-colors cursor-pointer">
                    {bc.nombre}
                  </button>
                </span>
              ))}
              {databaseActual && (
                <span className="flex items-center gap-1">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-800 font-semibold cursor-pointer">{databaseActual.nombre}</span>
                </span>
              )}
            </nav>

            {/* Contenido explorador */}
            <div className="flex-1 overflow-y-auto">
              {cargandoExplorador ? (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Cargando...</span>
                </div>
              ) : databaseActual ? (
                <div className="flex flex-col gap-2">
                  {databaseActual.metadata.partidas.map((partida) => {
                    const key = `${databaseActual.id}-${partida.index}`;
                    const esteLoading = loadingId === key;
                    return (
                      <button
                        key={partida.index}
                          title={partida.blancas && partida.negras
                            ? `${partida.blancas} - ${partida.negras}`
                            : `Partida ${partida.index + 1}`}
                        onClick={() => cargarPartidaDeArchivo(databaseActual.id, partida.index)}
                        disabled={loadingId !== null}
                        className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all text-left disabled:opacity-50 cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {partida.blancas && partida.negras
                              ? `${partida.blancas} - ${partida.negras}`
                              : `Partida ${partida.index + 1}`}
                          </p>
                          {partida.resultado && (
                            <p className="text-xs text-slate-500">{partida.resultado}</p>
                          )}
                        </div>
                        {esteLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {carpetas.length === 0 && archivos.length === 0 && (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      {carpetaActual ? 'Esta carpeta está vacía.' : 'No hay carpetas creadas.'}
                    </div>
                  )}
                  {carpetas.map(carpeta => (
                    <button
                      key={carpeta.id}
                      onClick={() => entrarCarpeta(carpeta)}
                      className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl transition-all text-left cursor-pointer"
                    >
                      <span className="text-lg">📁</span>
                      <span className="text-sm font-semibold text-slate-800 flex-1">{carpeta.nombre}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                  {archivos.map(arch => {
                    const esteLoading = loadingId === arch.id;
                    return (
                      <button
                        key={arch.id}
                        title={arch.nombre}
                        onClick={() => arch.metadata.es_base_datos
                          ? setDatabaseActual(arch)
                          : cargarPartidaDeArchivo(arch.id)
                        }
                        disabled={loadingId !== null}
                        className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all text-left disabled:opacity-50 cursor-pointer"
                      >
                        {arch.metadata.es_base_datos
                          ? <span className="text-lg">🗃️</span>
                          : <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                        }
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">{arch.nombre}</p>
                          {arch.metadata.es_base_datos && (
                            <p className="text-xs text-slate-500">{arch.metadata.total_partidas} partidas</p>
                          )}
                        </div>
                        {arch.metadata.es_base_datos
                          ? <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          : esteLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
                        }
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}