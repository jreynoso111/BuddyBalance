import { Platform } from 'react-native';

import { supabase } from '@/services/supabase';
import { webApiRequest } from '@/services/webApi';

export async function submitSupportMessage(options: {
  userId: string;
  subject?: string | null;
  message: string;
}) {
  if (Platform.OS === 'web') {
    return webApiRequest<{ ok: true }>('/api/support-messages', {
      method: 'POST',
      body: JSON.stringify({
        subject: options.subject || null,
        message: options.message,
      }),
    });
  }

  const { error } = await supabase.from('support_messages').insert([
    {
      user_id: options.userId,
      channel: 'in_app',
      subject: options.subject || null,
      message: options.message,
      status: 'open',
    },
  ]);

  if (error) {
    throw new Error(error.message);
  }
}
