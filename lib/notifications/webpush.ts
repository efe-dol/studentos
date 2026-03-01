import webpush from 'web-push';

let initialized = false;

const ensureInitialized = () => {
  if (initialized) {
    return;
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@studentos.app';

  if (!publicKey || !privateKey) {
    throw new Error('Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  initialized = true;
};

export const sendWebPush = async (
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  },
  payload: Record<string, unknown>
) => {
  ensureInitialized();
  return webpush.sendNotification(subscription, JSON.stringify(payload));
};
