import { NextResponse } from 'next/server';
import { handleApiError } from './errorHandler';

/**
 * Higher-order function to wrap API routes with standardized error handling
 * @param {Function} handler - The API route handler function
 * @returns {Function} Wrapped handler with error handling
 */
export function withErrorHandler(handler) {
  return async function wrappedHandler(req, ...args) {
    try {
      return await handler(req, ...args);
    } catch (error) {
      const { body, status } = handleApiError(error);
      return NextResponse.json(body, { status });
    }
  };
} 