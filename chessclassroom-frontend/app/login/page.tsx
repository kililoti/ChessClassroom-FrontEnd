'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
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

      localStorage.setItem('token', data.data.token);
      localStorage.setItem('usuario', JSON.stringify(data.data.usuario));

      setStatus({ loading: false, error: '', success: '¡Bienvenido! Redirigiendo...' });

      const redirectUrl = searchParams.get('redirect');

      setTimeout(() => {
        if (redirectUrl) {
          router.push(redirectUrl);
        } else {
          router.push('/dashboard');
        }
      }, 1500);

    } catch (error: any) {
      setStatus({ loading: false, error: error.message, success: '' });
    }
  };

  const redirectUrl = searchParams.get('redirect');
  const linkRegistro = redirectUrl ? `/registro?redirect=${redirectUrl}` : '/registro';

  return (
    <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
        Iniciar Sesión
      </h2>
      <p className="text-center text-gray-500 mb-8 text-sm">
        Ingresa tus credenciales para acceder a ChessClassroom
      </p>

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

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Contraseña</label>
            <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
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

        <button
          type="submit"
          disabled={status.loading}
          className={`w-full py-2 px-4 text-white font-semibold rounded-lg shadow-md transition-colors cursor-pointer
            ${status.loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
          `}
        >
          {status.loading ? 'Verificando...' : 'Entrar'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-gray-600">
        ¿No tienes cuenta?{' '}
        <Link href={linkRegistro} className="text-blue-600 font-medium hover:underline">
          Regístrate aquí
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={<div className="text-gray-500 animate-pulse">Cargando...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}