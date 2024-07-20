import * as crypto from 'crypto';

export const delay = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const sha256Buffer = (input: string | Uint8Array) => {
  return crypto.createHash('sha256').update(input).digest();
};

export const sha256Str = (input: string | Uint8Array) => {
  return crypto.createHash('sha256').update(input).digest('hex');
};

export const uppercaseHash = (data: string) => {
  return crypto.createHash('sha256').update(data).digest('hex').toUpperCase();
}

export const sortObjectKeys = (obj: Record<string, string>) => {
  return Object.fromEntries(
    Object.entries(obj || {}).sort((a, b) => a[0].localeCompare(b[0]))
  );
};

export const ignoreObjectKeys = (obj: Record<string, string>, prevent: string[] | undefined) => {
  return Object.fromEntries(
    Object.entries(obj || {}).filter(([k, v]) => !prevent?.includes(k))
  );
};