import React from 'react';
import JuegoAjedrez from '@/components/ajedrez/JuegoAjedrez';

export default function MiPaginaDeAjedrez() {
  return (
    <main className="min-h-screen bg-slate-100 py-10">
      <div className="container mx-auto">
        <h1 className="text-4xl font-extrabold text-center text-slate-800 mb-8">
          Plataforma de Ajedrez
        </h1>
        
        <JuegoAjedrez />
        
      </div>
    </main>
  );
}