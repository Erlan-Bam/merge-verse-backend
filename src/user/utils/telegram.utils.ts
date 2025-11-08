import { HttpException } from '@nestjs/common';
import * as crypto from 'crypto';

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
  photo_url?: string;
}

export interface ParsedInitData {
  user: TelegramUser;
  auth_date: number;
  hash: string;
  query_id?: string;
  signature?: string;
  [key: string]: any;
}

/**
 * Validates Telegram Login Widget data
 * @param initData - The initData string from Telegram Login Widget
 * @param botToken - The bot token from Telegram
 * @returns Parsed data if valid, throws error if invalid
 */
export function validateTelegramLoginWidget(
  initData: string,
  botToken: string,
): ParsedInitData {
  // Decode the initData if it's URL-encoded
  let decodedInitData = initData;
  if (initData.includes('%')) {
    decodedInitData = decodeURIComponent(initData);
  }

  const params: Map<string, string> = new Map();
  const pairs = decodedInitData.split('&');

  let hash = '';

  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=');
    const value = valueParts.join('=');

    if (key === 'hash') {
      hash = value;
    } else {
      // Decode the value once more if it contains URL encoding
      const decodedValue = value.includes('%')
        ? decodeURIComponent(value)
        : value;
      params.set(key, decodedValue);
    }
  }

  if (!hash) {
    throw new HttpException('Hash is missing from initData', 400);
  }

  // For Login Widget, use SHA256 directly on the bot token
  const secretKey = crypto.createHash('sha256').update(botToken).digest();

  // Sort keys and create data check string
  const sortedKeys = Array.from(params.keys()).sort();
  const dataCheckString = sortedKeys
    .map((key) => `${key}=${params.get(key)}`)
    .join('\n');

  // Calculate hash using HMAC-SHA256
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (calculatedHash !== hash) {
    throw new HttpException('Invalid hash - data integrity check failed', 400);
  }

  // Parse the result
  const result: ParsedInitData = {
    user: {} as TelegramUser,
    auth_date: 0,
    hash,
  };

  params.forEach((value, key) => {
    if (key === 'user') {
      try {
        result.user = JSON.parse(value);
      } catch (error) {
        throw new HttpException('Invalid user data format', 400);
      }
    } else if (key === 'auth_date') {
      result.auth_date = parseInt(value, 10);
    } else {
      result[key] = value;
    }
  });

  // Validate auth_date (within 24 hours)
  const authDate = result.auth_date * 1000;
  const currentTime = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;

  if (currentTime - authDate > maxAge) {
    throw new HttpException('Auth data is too old', 401);
  }

  return result;
}

/**
 * Validates Telegram Web App initData
 * @param initData - The initData string from Telegram Web App
 * @param botToken - The bot token from Telegram
 * @returns Parsed data if valid, throws error if invalid
 */
export function validateTelegramWebAppData(
  initData: string,
  botToken: string,
): ParsedInitData {
  // Decode the initData if it's URL-encoded
  let decodedInitData = initData;
  if (initData.includes('%')) {
    decodedInitData = decodeURIComponent(initData);
  }

  // Check if this is Login Widget data (has signature field)
  if (decodedInitData.includes('signature=')) {
    return validateTelegramLoginWidget(initData, botToken);
  }

  const params: Map<string, string> = new Map();
  const pairs = decodedInitData.split('&');

  let hash = '';

  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split('=');
    const value = valueParts.join('=');

    if (key === 'hash') {
      hash = value;
    } else if (key !== 'signature') {
      // Ignore signature field (used in Login Widget, not Web Apps)
      // Decode the value once more if it contains URL encoding
      const decodedValue = value.includes('%')
        ? decodeURIComponent(value)
        : value;
      params.set(key, decodedValue);
    }
  }

  if (!hash) {
    throw new HttpException('Hash is missing from initData', 400);
  }

  // Create secret key using bot token (Web App method)
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  // Sort keys and create data check string
  const sortedKeys = Array.from(params.keys()).sort();
  const dataCheckString = sortedKeys
    .map((key) => `${key}=${params.get(key)}`)
    .join('\n');

  // Calculate hash
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (calculatedHash !== hash) {
    throw new HttpException('Invalid hash - data integrity check failed', 400);
  }

  // Parse the result
  const result: ParsedInitData = {
    user: {} as TelegramUser,
    auth_date: 0,
    hash,
  };

  params.forEach((value, key) => {
    if (key === 'user') {
      try {
        result.user = JSON.parse(value);
      } catch (error) {
        throw new HttpException('Invalid user data format', 400);
      }
    } else if (key === 'auth_date') {
      result.auth_date = parseInt(value, 10);
    } else {
      result[key] = value;
    }
  });

  // Validate auth_date (within 24 hours)
  const authDate = result.auth_date * 1000;
  const currentTime = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;

  if (currentTime - authDate > maxAge) {
    throw new HttpException('Auth data is too old', 401);
  }

  return result;
}
