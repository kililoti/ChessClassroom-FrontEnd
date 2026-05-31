'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [status, setStatus] = useState({
    loading: false,
    error: '',
    success: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus({ loading: true, error: '', success: '' });

    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Credenciales incorrectas');
      }

      // --- PERSISTENCIA DE LA SESIÓN ---
      // Guardar el token y los datos del usuario en localStorage
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('usuario', JSON.stringify(data.data.usuario));

      setStatus({ loading: false, error: '', success: '¡Bienvenido! Redirigiendo...' });

      // Redirigimos al dashboard
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (error: any) {
      setStatus({ loading: false, error: error.message, success: '' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Iniciar Sesión
        </h2>
        <p className="text-center text-gray-500 mb-8 text-sm">
          Ingresa tus credenciales para acceder a ChessClassroom
        </p>

        {/* Mensajes de feedback */}
        {status.error && (
          <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg">
            {status.error}
          </div>
        )}
        {status.success && (
          <div className="mb-4 p-3 text-sm text-green-700 bg-green-100 rounded-lg">
            {status.success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              placeholder="correo@ejemplo.com"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Contraseña</label>
              <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline"> {/* Link con cambio de página a forgot-password */}
                ¿La has olvidado?
              </Link>
            </div>
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              placeholder="••••••••"
            />
          </div>

          {/* Botón de Submit */}
          <button
            type="submit"
            disabled={status.loading}
            className={`w-full py-2 px-4 text-white font-semibold rounded-lg shadow-md transition-colors
              ${status.loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
            `}
          >
            {status.loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>

        {/* Link al registro */}
        <p className="mt-8 text-center text-sm text-gray-600">
          ¿No tienes cuenta?{' '}
          <Link href="/registro" className="text-blue-600 font-medium hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
}