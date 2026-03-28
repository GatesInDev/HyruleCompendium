import mongoSanitize from 'mongo-sanitize';

/**
 * Sanitizes user input to prevent NoSQL injection.
 * Removes any keys starting with '$' or '.' from objects and returns strings directly.
 */
export function sanitizeInput<T>(input: T): T {
  if (typeof input === 'string') {
    // Basic string escaping if necessary, but mongoose handles SQL/NoSQL injections for strings usually.
    // mongo-sanitize strips object keys that start with $
    return input;
  }
  return mongoSanitize(input);
}

/**
 * Safely parses JSON string and sanitizes it
 */
export function safeJsonParse(jsonString: string) {
  try {
    const parsed = JSON.parse(jsonString);
    return sanitizeInput(parsed);
  } catch (e) {
    return null;
  }
}
