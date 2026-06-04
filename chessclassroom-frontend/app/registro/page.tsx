'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams(); // <-- Inicializa el hook para leer la URL
  
  // Estado para los campos del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    email: '',
    password: '',
    rol: 'alumno', // Valor por defecto
  });

  // Estado para manejar la carga y los mensajes de la interfaz
  const [status, setStatus] = useState({
    loading: false,
    error: '',
    success: '',
  });

  // Función para actualizar el estado cuando el usuario escribe
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Función que se ejecuta al enviar el formulario
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus({ loading: true, error: '', success: '' });

    try {
      const res = await fetch('http://localhost:3001/api/auth/registro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Ocurrió un error al registrarse');
      }

      // Si todo va bien
      setStatus({ loading: false, error: '', success: '¡Cuenta creada con éxito! Redirigiendo al login...' });
      
      // Lee si hay un redirect y se lo pasa a la página de login
      const redirectUrl = searchParams.get('redirect');

      setTimeout(() => {
        if (redirectUrl) {
          router.push(`/login?redirect=${redirectUrl}`); // Pasa el redirect al login
        } else {
          router.push('/login');
        }
      }, 2000);

    } catch (error: any) {
      setStatus({ loading: false, error: error.message, success: '' });
    }
  };

  // Preparar el link de login por si el usuario se equivocó de pantalla
  const redirectUrl = searchParams.get('redirect');
  const linkLogin = redirectUrl ? `/login?redirect=${redirectUrl}` : '/login';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Crear una cuenta
        </h2>

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                name="nombre"
                required
                value={formData.nombre}
                onChange={handleChange}
                className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Carlos"
              />
            </div>

            {/* Apellidos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
              <input
                type="text"
                name="apellidos"
                required
                value={formData.apellidos}
                onChange={handleChange}
                className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Kasparov"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="correo@ejemplo.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {/* Rol */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de cuenta</label>
            <select
              name="rol"
              value={formData.rol}
              onChange={handleChange}
              className="w-full px-4 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
            >
              <option value="alumno">Soy Alumno</option>
              <option value="profesor">Soy Profesor</option>
            </select>
          </div>

          {/* Botón de Submit */}
          <button
            type="submit"
            disabled={status.loading}
            className={`w-full py-2 px-4 text-white font-semibold rounded-lg shadow-md transition-colors
              ${status.loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
            `}
          >
            {status.loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        {/* Link al login */}
        <p className="mt-8 text-center text-sm text-gray-600">
          ¿Ya tienes cuenta?{' '}
          <Link href={linkLogin} className="text-blue-600 font-medium hover:underline">
            Inicia sesión aquí
          </Link>
        </p>
      </div>
    </div>
  );
}