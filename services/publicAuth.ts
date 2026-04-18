import { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { supabase } from '@/services/supabase';

type PublicAuthSignInResponse = {
  ok: true;
  action: 'sign_in_with_password';
  session: {
    access_token: string;
    refresh_token: string;
  };
};

async function getFunctionErrorMessage(error: any, fallback: string) {
  const fallbackMessage = String(error?.message || fallback || '').trim() || fallback;
  const context = error?.context;

  if (!context || typeof context.text !== 'function') {
    return fallbackMessage;
  }

  try {
    const response = typeof context.clone === 'function' ? context.clone() : context;
    const raw = await response.text();
    if (!raw) return fallbackMessage;

    try {
      const parsed = JSON.parse(raw);
      const message = String(parsed?.error || parsed?.message || '').trim();
      return message || fallbackMessage;
    } catch {
      return raw.trim() || fallbackMessage;
    }
  } catch {
    return fallbackMessage;
  }
}

export async function sendPublicRegistrationCode(options: {
  email: string;
  fullName: string;
  turnstileToken?: string | null;
}) {
  if (Platform.OS !== 'web') {
    const { error } = await supabase.auth.signInWithOtp({
      email: options.email,
      options: {
        shouldCreateUser: true,
        data: {
          full_name: options.fullName,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase.functions.invoke('public-auth', {
    body: {
      action: 'send_registration_code',
      email: options.email,
      fullName: options.fullName,
      turnstileToken: options.turnstileToken,
    },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error, 'Could not send the verification code.'));
  }
}

export async function sendPublicPasswordReset(options: {
  email: string;
  redirectTo: string;
  turnstileToken?: string | null;
}) {
  if (Platform.OS !== 'web') {
    const { error } = await supabase.auth.resetPasswordForEmail(options.email, {
      redirectTo: options.redirectTo,
    });

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase.functions.invoke('public-auth', {
    body: {
      action: 'send_password_reset',
      email: options.email,
      redirectTo: options.redirectTo,
      turnstileToken: options.turnstileToken,
    },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error, 'Could not send the recovery email.'));
  }
}

export async function signInWithPublicPassword(options: {
  email: string;
  password: string;
  turnstileToken?: string | null;
}): Promise<Session | null> {
  if (Platform.OS !== 'web') {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: options.email,
      password: options.password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data.session ?? null;
  }

  const { data, error } = await supabase.functions.invoke<PublicAuthSignInResponse>('public-auth', {
    body: {
      action: 'sign_in_with_password',
      email: options.email,
      password: options.password,
      turnstileToken: options.turnstileToken,
    },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error, 'Could not sign in right now.'));
  }

  const accessToken = data?.session?.access_token || '';
  const refreshToken = data?.session?.refresh_token || '';
  if (!accessToken || !refreshToken) {
    throw new Error('Could not establish your session. Please try again.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  return sessionData.session ?? null;
}
