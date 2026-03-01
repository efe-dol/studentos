import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY || 'your-secret-key-32-chars-long!!';

// Validiere Encryption Key
if (ENCRYPTION_KEY.length < 32) {
  console.warn(`⚠️ CREDENTIALS_ENCRYPTION_KEY ist zu kurz (${ENCRYPTION_KEY.length} chars, benötige mindestens 32)`);
}

// Verschlüssele Credentials
export function encryptCredentials(email: string, password: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const keyBuffer = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
    const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, iv);
    
    const credentials = JSON.stringify({ email, password });
    let encrypted = cipher.update(credentials, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Verschlüsselung fehlgeschlagen');
  }
}

// Entschlüssele Credentials
export function decryptCredentials(encryptedData: string): { email: string; password: string } {
  try {
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const keyBuffer = Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Entschlüsselung fehlgeschlagen');
  }
}

// Speichere Elternportal-Credentials
export async function saveElternportalCredentials(
  userId: string,
  email: string,
  password: string
) {
  const supabase = await createClient();
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
  const supabase = await createClient();
  
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
