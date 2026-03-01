import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY || 'your-secret-key-32-chars-long!!';

// Verschlüssele Credentials
export function encryptCredentials(email: string, password: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32)), iv);
  
  const credentials = JSON.stringify({ email, password });
  let encrypted = cipher.update(credentials, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

// Entschlüssele Credentials
export function decryptCredentials(encryptedData: string): { email: string; password: string } {
  const [ivHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32)), iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}

// Speichere Elternportal-Credentials
export async function saveElternportalCredentials(
  userId: string,
  email: string,
  password: string
) {
  const supabase = createClient();
  const encrypted = encryptCredentials(email, password);

  const { error } = await supabase
    .from('profiles')
    .update({
      elternportal_credentials: encrypted,
      updated_at: new Date(),
    })
    .eq('id', userId);

  return { error };
}

// Hole Elternportal-Credentials
export async function getElternportalCredentials(userId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('elternportal_credentials')
    .eq('id', userId)
    .single();

  if (error || !data?.elternportal_credentials) {
    return { email: null, password: null, error };
  }

  try {
    const credentials = decryptCredentials(data.elternportal_credentials);
    return credentials;
  } catch (error) {
    return { email: null, password: null, error };
  }
}
