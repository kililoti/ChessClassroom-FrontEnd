'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Clase {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: 'grupal' | 'particular';
  activo: boolean;
  codigo_invitacion: string;
}

export default function ParticularesPage() {
  const router = useRouter();
  const [clases, setClases] = useState<Clase[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [descripcionNueva, setDescripcionNueva] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');
  
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  // Estados y constantes para la paginación clases
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 5;

  // Efecto para verificar la sesión y cargar las clases particulares al cargar la página
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('usuario');
    
    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(userStr);
    setRolUsuario(user.rol);
    
    const endpoint = user.rol === 'profesor' 
      ? `${process.env.NEXT_PUBLIC_API_URL}/clases/profesor/${user.id}`
      : `${process.env.NEXT_PUBLIC_API_URL}/clases/alumno/${user.id}`;

    fetch(endpoint)
      .then((res) => {
        if (!res.ok) throw new Error('Error en la respuesta del servidor');
        return res.json();
      })
      .then((data: Clase[]) => {
        const soloParticulares = data.filter(c => c.tipo === 'particular');
        setClases(soloParticulares);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error cargando clases:", err);
        setLoading(false);
      });
  }, [router]);

  // Función para activar/desactivar una clase (solo para profesores)
  const handleToggleEstado = async (id: string, estadoActual: boolean) => {
    if (rolUsuario !== 'profesor') return;

    const nuevoEstado = !estadoActual;
    setClases(clases.map(c => c.id === id ? { ...c, activo: nuevoEstado } : c));

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clases/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: nuevoEstado }),
      });

      if (!res.ok) throw new Error('Error al actualizar en el servidor');
    } catch (error) {
      console.error(error);
      setClases(clases.map(c => c.id === id ? { ...c, activo: estadoActual } : c));
      alert("Hubo un error al cambiar el estado");
    }
  };

  // Función para crear una nueva clase particular (solo para profesores)
  const handleCrearClase = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('usuario') || '{}');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clases/crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          profesorId: user.id, 
          nombre: nombreNuevo, 
          descripcion: descripcionNueva,
          tipo: 'particular' 
        }),
      });

      if (res.ok) {
        const nuevaClase = await res.json();
        const nuevasClases = [...clases, nuevaClase];
        setClases(nuevasClases);
        setNombreNuevo('');
        setDescripcionNueva('');
        setMostrarFormulario(false);
        
        // Ir a la última página automáticamente para ver la clase recién creada
        const totalPaginas = Math.ceil(nuevasClases.length / ITEMS_POR_PAGINA);
        setPaginaActual(totalPaginas);

      } else {
        alert("Error al crear la clase. Asegúrate de tener rol de profesor.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Función para copiar el enlace de invitación al portapapeles
  const handleCopiarEnlace = (codigo: string, id: string) => {
    const url = `${window.location.origin}/invite/${codigo}`;
    
    navigator.clipboard.writeText(url).then(() => {
      setCopiadoId(id);
      setTimeout(() => {
        setCopiadoId(null);
      }, 2000);
    }).catch(err => {
      console.error("No se pudo copiar: ", err);
      alert("Tu navegador no permite copiar al portapapeles automáticamente.");
    });
  };

  // Cálculos matemáticos para la paginación de clases
  const totalPaginas = Math.ceil(clases.length / ITEMS_POR_PAGINA);
  const indiceInicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const indiceFin = indiceInicio + ITEMS_POR_PAGINA;
  const clasesPaginadas = clases.slice(indiceInicio, indiceFin);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 font-medium animate-pulse">Cargando clases...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        
        <div className="bg-white p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-2xl">
            ♟️
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Listado de clases particulares
          </h1>
        </div>

        <div className="p-6 bg-slate-50/50 min-h-[300px] flex flex-col justify-between">
          {clases.length === 0 ? (
            <div className="text-center mt-12">
              <p className="text-slate-500 text-lg">Aún no hay clases particulares registradas.</p>
            </div>
          ) : (
            <>
              {/* Renderizar páginas de clases */}
              <ul className="space-y-4">
                {clasesPaginadas.map((clase) => (
                  <li 
                    key={clase.id}
                    // OnClick principal para navegar a la clase
                    onClick={() => router.push(`/clases/${clase.id}`)} 
                    // Cursor-pointer y group para efectos visuales
                    className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 gap-4 cursor-pointer group"
                  >
                    <div>
                      {/* Efecto de color al hacer hover sobre la tarjeta */}
                      <span className="font-bold text-lg text-slate-900 block group-hover:text-blue-600 transition-colors">
                        {clase.nombre}
                      </span>
                      
                      <div className="text-sm text-slate-500 mt-2 flex items-center gap-2 flex-wrap">
                        Código: <span className="font-mono bg-slate-100 px-2 py-1 rounded border border-slate-200 text-slate-700">{clase.codigo_invitacion}</span>
                        
                        {rolUsuario === 'profesor' && (
                          <button
                            // Detener la propagación para no navegar al pulsar copiar
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopiarEnlace(clase.codigo_invitacion, clase.id);
                            }}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                              copiadoId === clase.id 
                                ? 'bg-green-100 text-green-700 border border-green-200' 
                                : 'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100'
                            }`}
                          >
                            {copiadoId === clase.id ? '✓ Enlace Copiado' : '🔗 Copiar Enlace'}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <button 
                      // Detener la propagación para no navegar al pulsar activar/desactivar
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleEstado(clase.id, clase.activo);
                      }}
                      disabled={rolUsuario !== 'profesor'} 
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg border transition-colors ${
                        rolUsuario === 'profesor' ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default opacity-90'
                      } ${clase.activo ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                    >
                      <span className={`text-sm font-semibold ${clase.activo ? 'text-green-700' : 'text-red-700'}`}>
                        {clase.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      <div className={`w-4 h-4 rounded-full shadow-inner ${
                        clase.activo ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                    </button>
                  </li>
                ))}
              </ul>

              {/* Controles de páginas de clases */}
              {totalPaginas > 1 && (
                <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-4">
                  <button
                    onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                    disabled={paginaActual === 1}
                    className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    <span>←</span> Anterior
                  </button>
                  
                  <span className="text-sm font-medium text-slate-500">
                    Página <span className="text-slate-900">{paginaActual}</span> de <span className="text-slate-900">{totalPaginas}</span>
                  </span>

                  <button
                    onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
                    disabled={paginaActual === totalPaginas}
                    className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente <span>→</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Formulario para crear una nueva clase */}
        {mostrarFormulario && rolUsuario === 'profesor' && (
          <form onSubmit={handleCrearClase} className="p-6 bg-blue-50/50 border-t border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="text-blue-600">+</span> Crear clase
            </h3>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Nombre de la clase (Ej: David - Ajedrez para principiantes)"
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                className="p-3 rounded-lg bg-white text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                required
              />
              <input
                type="text"
                placeholder="Descripción (opcional)"
                value={descripcionNueva}
                onChange={(e) => setDescripcionNueva(e.target.value)}
                className="p-3 rounded-lg bg-white text-slate-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button 
                  type="button" 
                  onClick={() => setMostrarFormulario(false)}
                  className="px-5 py-2.5 text-slate-600 font-medium hover:text-slate-900 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  Crear clase
                </button>
              </div>
            </div>
          </form>
        )}

        {!mostrarFormulario && (
          <div className="bg-white p-6 border-t border-slate-200 flex justify-between items-center rounded-b-2xl">
            {rolUsuario === 'profesor' ? (
              <button 
                onClick={() => setMostrarFormulario(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Crear clase
              </button>
            ) : (
              <div></div>
            )}
            
            <button 
              onClick={() => router.push('/dashboard')}
              className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-6 rounded-lg border border-slate-300 transition-colors shadow-sm cursor-pointer"
            >
              Volver
            </button>
          </div>
        )}
      </div>
    </div>
  );
}