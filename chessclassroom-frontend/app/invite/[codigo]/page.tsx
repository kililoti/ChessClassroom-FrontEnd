'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface InfoClase {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: 'grupal' | 'particular';
  activo: boolean;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  
  // Estados de la invitación
  const [info, setInfo] = useState<InfoClase | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  
  // Estado para verificar si el usuario ya está autenticado
  const [tieneSesion, setTieneSesion] = useState(false);

  useEffect(() => {
    // 1. Comprobamos si el usuario ya está logueado en la plataforma
    setTieneSesion(!!localStorage.getItem('usuario'));

    // 2. Extraemos el código dinámico de la URL
    const codigo = params.codigo as string;
    if (!codigo) return;

    // 3. Consultamos la información pública de la clase al backend
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/clases/invite/${codigo}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Invitación no válida');
        return data;
      })
      .then((data: InfoClase) => {
        setInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [params.codigo]);

  const handleAceptarInvitacion = async () => {
    const codigo = params.codigo as string;

    setProcesando(true);
    const userStr = localStorage.getItem('usuario');
    const usuario = JSON.parse(userStr || '{}');

    // Protección: Solo los alumnos pueden usar este flujo para inscribirse
    if (usuario.rol !== 'alumno') {
      alert("Solo los alumnos pueden unirse a las clases mediante un código de invitación.");
      setProcesando(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/clases/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumnoId: usuario.id,
          codigo: codigo
        })
      });

      const data = await res.json();

      if (res.ok) {
        // Éxito: Lo enviamos directo a su nuevo panel de control
        router.push('/dashboard');
      } else {
        throw new Error(data.error || 'Error al unirse a la clase');
      }
    } catch (err: any) {
      alert(err.message);
      setProcesando(false);
    }
  };

  // Pantalla de carga inicial (Buscando en la Base de Datos)
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <span className="text-4xl text-slate-300 animate-bounce mb-4">♞</span>
        <div className="text-slate-500 font-medium animate-pulse">Buscando invitación...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden text-center">
        
        {/* Cabecera Corporativa */}
        <div className="bg-white p-6 border-b border-slate-100">
          <Link href="/dashboard" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-3xl text-slate-800">♞</span>
            <span className="text-xl font-bold text-slate-800 tracking-tight">
              Chess<span className="text-blue-600">Classroom</span>
            </span>
          </Link>
        </div>

        <div className="p-8">
          {error ? (
            // CASO A: El enlace falló (Código inválido o clase desactivada)
            <div className="space-y-4">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-2xl mx-auto border border-red-100 shadow-sm">
                ✕
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Enlace no válido</h2>
              <p className="text-slate-500 text-sm leading-relaxed">{error}</p>
              
              <button 
                onClick={() => router.push('/dashboard')}
                className="w-full mt-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl transition-colors border border-slate-200"
              >
                Volver al inicio
              </button>
            </div>
          ) : (
            // CASO B: Invitación válida encontrada
            <div className="space-y-6">
              <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner border border-blue-100">
                {info?.tipo === 'particular' ? '♟️' : '👥'}
              </div>
              
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">
                  Te han invitado a una clase {info?.tipo === 'particular' ? 'Particular' : 'Grupal'}
                </p>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {info?.nombre}
                </h2>
                
                {/* Mostramos la descripción si existe */}
                {info?.descripcion && (
                  <p className="mt-3 text-sm text-slate-500 leading-relaxed px-4">
                    {info.descripcion}
                  </p>
                )}
              </div>

              {/* Botones de Acción Condicionales Inteligentes */}
              <div className="pt-4 space-y-3">
                {tieneSesion ? (
                  // Si el usuario ya está logueado en la plataforma
                  <>
                    <button 
                      onClick={handleAceptarInvitacion}
                      disabled={procesando}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2 text-base"
                    >
                      {procesando ? 'Procesando...' : 'Aceptar Invitación y Unirme'}
                    </button>
                    
                    <button 
                      onClick={() => router.push('/dashboard')}
                      className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl transition-colors"
                    >
                      Rechazar
                    </button>
                  </>
                ) : (
                  // Si el usuario no ha iniciado sesión ni tiene cuenta creada
                  <>
                    <button 
                      onClick={() => router.push(`/login?redirect=/invite/${params.codigo}`)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2 text-base"
                    >
                      Ya tengo cuenta (Iniciar sesión)
                    </button>
                    
                    <button 
                      onClick={() => router.push(`/registro?redirect=/invite/${params.codigo}`)}
                      className="w-full bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 font-semibold py-3 px-4 rounded-xl transition-colors"
                    >
                      Crear cuenta para unirte
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}