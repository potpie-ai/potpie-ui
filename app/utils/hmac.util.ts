import crypto from 'crypto';

export const generateHmacSignature = (message: string): string => {
  const hmacKey = process.env.NEXT_PUBLIC_HMAC_SECRET_KEY;
  
  if (!hmacKey) {
    throw new Error("HMAC secret key not configured");
  }

  const hmac = crypto.createHmac('sha256', hmacKey);
  hmac.update(message);
  return hmac.digest('hex');
}; 