import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-200">
      {/* --- NAVEGACIÓN --- */}
      <nav className="w-full bg-white/80 backdrop-blur-md fixed top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">♞</span>
            <span className="text-xl font-bold tracking-tight text-slate-800">
              Chess<span className="text-blue-600">Classroom</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Iniciar sesión
            </Link>
            <Link 
              href="/registro" 
              className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition-colors"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <header className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Fondo decorativo (Efecto tablero sutil) */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold mb-6 border border-blue-100">
            <span className="text-base">♔</span> La plataforma definitiva para profesores
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 drop-shadow-sm">
            Jaque mate al <br className="hidden lg:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              desorden en tus clases
            </span>
          </h1>
          <p className="mt-4 text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto mb-10">
            Gestiona a tus alumnos, organiza partidas, sube material didáctico y automatiza tus cobros. Todo tu ecosistema de enseñanza de ajedrez en un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link 
              href="/registro" 
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white bg-slate-900 rounded-xl shadow-lg hover:bg-slate-800 hover:shadow-xl transition-all cursor-pointer"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      {/* --- FEATURES SECTION --- */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Tu mejor jugada estratégica</h2>
            <p className="mt-4 text-slate-600">Herramientas diseñadas específicamente para el ecosistema del ajedrez.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Tarjeta 1 */}
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-2xl mb-6">
                👥
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Gestión de Alumnos</h3>
              <p className="text-slate-600 leading-relaxed">
                Invita a tus alumnos con un link único. Haz seguimiento de su ELO, progreso y tareas asignadas desde un panel centralizado.
              </p>
            </div>

            {/* Tarjeta 2 */}
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-2xl mb-6">
                ♟️
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Análisis de Partidas</h3>
              <p className="text-slate-600 leading-relaxed">
                Integra visores PGN y analiza tácticas en tiempo real. Deja que tus alumnos aprendan de sus propios errores.
              </p>
            </div>

            {/* Tarjeta 3 */}
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-2xl mb-6">
                💳
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Pagos Integrados</h3>
              <p className="text-slate-600 leading-relaxed">
                Olvídate de perseguir transferencias. Gestiona mensualidades y cobros de clases particulares de forma automática.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-white">
            <span className="text-xl">♞</span>
            <span className="text-lg font-bold">ChessClassroom</span>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} Creado para Trabajo de Fin de Grado.
          </p>
        </div>
      </footer>
    </div>
  );
}