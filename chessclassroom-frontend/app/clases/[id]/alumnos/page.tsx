'use client';
 
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Pencil, UserX, Check, X, Search } from 'lucide-react';
 
interface AlumnoClase {
  alumno_id: string;
  nombre: string;
  apellidos: string;
  alias: string | null;
  fecha_inscripcion: string;
}
 
export default function AlumnosPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: claseId } = React.use(params);
 
  const [alumnos, setAlumnos] = useState<AlumnoClase[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [aliasEditado, setAliasEditado] = useState('');
  const [confirmandoExpulsar, setConfirmandoExpulsar] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
 
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
 
  const cargarAlumnos = async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/clases/${claseId}/alumnos`, { headers });
      if (res.ok) setAlumnos(await res.json());
    } catch (err) {
      console.error('Error al cargar alumnos:', err);
    } finally {
      setCargando(false);
    }
  };
 
  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    cargarAlumnos();
  }, [claseId]);
 
  const alumnosFiltrados = alumnos.filter(a => {
    const termino = busqueda.toLowerCase();
    const nombreCompleto = `${a.nombre} ${a.apellidos}`.toLowerCase();
    const alias = (a.alias ?? '').toLowerCase();
    return nombreCompleto.includes(termino) || alias.includes(termino);
  });
 
  // Nombre visible en la clase: alias si existe, si no nombre real
  const nombreVisible = (a: AlumnoClase) => a.alias ?? `${a.nombre} ${a.apellidos}`;
 
  const iniciarEdicion = (a: AlumnoClase) => {
    setEditandoId(a.alumno_id);
    setAliasEditado(a.alias ?? `${a.nombre} ${a.apellidos}`);
    setConfirmandoExpulsar(null);
  };
 
  const cancelarEdicion = () => {
    setEditandoId(null);
    setAliasEditado('');
  };
 
  const guardarAlias = async (alumnoId: string) => {
    setGuardando(true);
    try {
      const res = await fetch(`http://localhost:3001/api/clases/${claseId}/alumnos/${alumnoId}/alias`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ alias: aliasEditado.trim() || null }),
      });
      if (res.ok) {
        setAlumnos(prev => prev.map(a =>
          a.alumno_id === alumnoId ? { ...a, alias: aliasEditado.trim() || null } : a
        ));
        cancelarEdicion();
      }
    } catch (err) {
      console.error('Error al guardar alias:', err);
    } finally {
      setGuardando(false);
    }
  };
 
  const expulsarAlumno = async (alumnoId: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/clases/${claseId}/alumnos/${alumnoId}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setAlumnos(prev => prev.filter(a => a.alumno_id !== alumnoId));
        setConfirmandoExpulsar(null);
      }
    } catch (err) {
      console.error('Error al expulsar alumno:', err);
    }
  };
 
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
 
        {/* Cabecera */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-slate-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-500" /> Gestión de alumnos
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {cargando ? '...' : `${alumnos.length} alumno${alumnos.length !== 1 ? 's' : ''} en la clase`}
            </p>
          </div>
        </div>
 
        {/* Buscador */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre o alias..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-sm"
          />
        </div>
 
        {/* Lista */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
 
          {cargando ? (
            <div className="py-16 text-center text-sm text-slate-400">Cargando alumnos...</div>
          ) : alumnosFiltrados.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              {busqueda ? 'No hay alumnos que coincidan con la búsqueda.' : 'No hay alumnos en esta clase.'}
            </div>
          ) : (
            alumnosFiltrados.map((alumno, i) => {
              const editando = editandoId === alumno.alumno_id;
              const confirmando = confirmandoExpulsar === alumno.alumno_id;
              const tieneAlias = !!alumno.alias;
 
              return (
                <div
                  key={alumno.alumno_id}
                  className={`flex items-center gap-4 px-5 py-4 transition-colors
                    ${i > 0 ? 'border-t border-slate-100' : ''}
                    ${confirmando ? 'bg-red-50' : editando ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'}
                  `}
                >
                  {/* Avatar inicial */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-white font-bold text-sm">
                      {alumno.nombre.charAt(0).toUpperCase()}{alumno.apellidos.charAt(0).toUpperCase()}
                    </span>
                  </div>
 
                  {/* Info / editor */}
                  <div className="flex-1 min-w-0">
                    {editando ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={aliasEditado}
                          onChange={e => setAliasEditado(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') guardarAlias(alumno.alumno_id);
                            if (e.key === 'Escape') cancelarEdicion();
                          }}
                          placeholder="Nombre en la clase..."
                          className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                          autoFocus
                        />
                        <button
                          onClick={() => guardarAlias(alumno.alumno_id)}
                          disabled={guardando}
                          className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                          title="Guardar"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={cancelarEdicion}
                          className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {nombreVisible(alumno)}
                        </p>
                        {tieneAlias && (
                          <p className="text-xs text-slate-400 truncate">
                            {alumno.nombre} {alumno.apellidos}
                          </p>
                        )}
                      </>
                    )}
                  </div>
 
                  {/* Acciones */}
                  {!editando && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {confirmando ? (
                        // Confirmación de expulsión inline
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600 font-medium">¿Expulsar?</span>
                          <button
                            onClick={() => expulsarAlumno(alumno.alumno_id)}
                            className="px-2.5 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                          >
                            Sí
                          </button>
                          <button
                            onClick={() => setConfirmandoExpulsar(null)}
                            className="px-2.5 py-1 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => iniciarEdicion(alumno)}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar nombre en la clase"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setConfirmandoExpulsar(alumno.alumno_id); setEditandoId(null); }}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Expulsar de la clase"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
 
        {/* Nota informativa */}
        {alumnos.length > 0 && (
          <p className="text-xs text-slate-400 text-center mt-4">
            El alias solo es visible dentro de esta clase. El nombre real del alumno no se modifica.
          </p>
        )}
      </div>
    </div>
  );
}