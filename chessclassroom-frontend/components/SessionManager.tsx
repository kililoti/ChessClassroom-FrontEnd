'use client';

import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SessionManager() {
  useEffect(() => {
    const renovarSesion = async () => {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return;

      const { data } = await supabasePublic.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (data.session) {
        localStorage.setItem('token', data.session.access_token);
        localStorage.setItem('refresh_token', data.session.refresh_token);
      } else {
        // El refresh token también expiró — limpiar sesión
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('usuario');
      }
    };

    renovarSesion();
  }, []);

  return null; // no renderiza nada
}