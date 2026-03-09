import { Platform } from 'react-native';

import { supabase } from '@/services/supabase';

type ApiErrorPayload = {
  error?: string;
};

export const isWebApiEnabled = Platform.OS === 'web';

export async function webApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isWebApiEnabled) {
    throw new Error('Web API requests are only supported on web.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });

  const payload = (await response.json().catch(() => null)) as T | ApiErrorPayload | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? payload.error
        : `Request failed with status ${response.status}`;
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return payload as T;
}
