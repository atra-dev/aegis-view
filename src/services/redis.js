import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || "redis://default:cxDOZ5TUj5dU76WyEn2rgwSXUmxmE467@redis-19658.c295.ap-southeast-1-1.ec2.redns.redis-cloud.com:19658";

let redisClient = null;

export const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = createClient({
      url: REDIS_URL
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis Client Connected');
    });

    await redisClient.connect();
  }

  return redisClient;
};

// Cache data with expiration
export const setCacheWithExpiry = async (key, value, expiryInSeconds = 3600) => {
  try {
    const client = await getRedisClient();
    await client.setEx(key, expiryInSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Redis setCacheWithExpiry Error:', error);
    return false;
  }
};

// Get cached data
export const getCachedData = async (key) => {
  try {
    const client = await getRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis getCachedData Error:', error);
    return null;
  }
};

// Delete cached data
export const deleteCachedData = async (key) => {
  try {
    const client = await getRedisClient();
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Redis deleteCachedData Error:', error);
    return false;
  }
};

// Get all keys matching a pattern
export const getKeys = async (pattern = '*') => {
  try {
    const client = await getRedisClient();
    return await client.keys(pattern);
  } catch (error) {
    console.error('Redis getKeys Error:', error);
    return [];
  }
};

// Clear all cached data
export const clearAllCache = async () => {
  try {
    const client = await getRedisClient();
    await client.flushAll();
    return true;
  } catch (error) {
    console.error('Redis clearAllCache Error:', error);
    return false;
  }
};

// Get time to live (TTL) for a key
export const getTTL = async (key) => {
  try {
    const client = await getRedisClient();
    return await client.ttl(key);
  } catch (error) {
    console.error('Redis getTTL Error:', error);
    return -2; // -2 means key does not exist
  }
};

// Check if key exists
export const exists = async (key) => {
  try {
    const client = await getRedisClient();
    return await client.exists(key);
  } catch (error) {
    console.error('Redis exists Error:', error);
    return false;
  }
}; 