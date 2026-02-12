/**
 * Input Validation Utilities
 * Centralized validation functions for API inputs
 * Helps prevent injection attacks and ensure data integrity
 */

/**
 * Validation error type
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  if (!email || typeof email !== "string") {
    throw new ValidationError("Email is required", "email");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw new ValidationError("Invalid email format", "email");
  }

  if (email.length > 255) {
    throw new ValidationError("Email is too long", "email");
  }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): void {
  if (!password || typeof password !== "string") {
    throw new ValidationError("Password is required", "password");
  }

  if (password.length < 8) {
    throw new ValidationError(
      "Password must be at least 8 characters long",
      "password",
    );
  }

  if (password.length > 128) {
    throw new ValidationError("Password is too long", "password");
  }

  // Check for at least one number, one letter
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new ValidationError(
      "Password must contain at least one letter and one number",
      "password",
    );
  }
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string, fieldName: string = "id"): void {
  if (!uuid || typeof uuid !== "string") {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(uuid)) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName);
  }
}

/**
 * Validate marketplace name
 */
export function validateMarketplace(marketplace: string): void {
  const validMarketplaces = ["ebay", "poshmark", "mercari", "flyp"] as const;

  if (!marketplace || typeof marketplace !== "string") {
    throw new ValidationError("Marketplace is required", "marketplace");
  }

  if (
    !validMarketplaces.includes(
      marketplace as (typeof validMarketplaces)[number],
    )
  ) {
    throw new ValidationError(
      `Invalid marketplace. Must be one of: ${validMarketplaces.join(", ")}`,
      "marketplace",
    );
  }
}

/**
 * Validate string length
 */
export function validateStringLength(
  value: string,
  fieldName: string,
  minLength: number,
  maxLength: number,
): void {
  if (!value || typeof value !== "string") {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }

  if (value.length < minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${minLength} characters long`,
      fieldName,
    );
  }

  if (value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must be at most ${maxLength} characters long`,
      fieldName,
    );
  }
}

/**
 * Validate listing title
 */
export function validateListingTitle(title: string): void {
  validateStringLength(title, "title", 3, 200);

  // Check for suspicious patterns
  if (/<script|javascript:|onerror=/i.test(title)) {
    throw new ValidationError("Title contains invalid content", "title");
  }
}

/**
 * Validate listing description
 */
export function validateListingDescription(description: string): void {
  if (!description || typeof description !== "string") {
    throw new ValidationError("Description is required", "description");
  }

  if (description.length < 10) {
    throw new ValidationError(
      "Description must be at least 10 characters long",
      "description",
    );
  }

  if (description.length > 5000) {
    throw new ValidationError(
      "Description is too long (max 5000 characters)",
      "description",
    );
  }

  // Check for suspicious patterns
  if (/<script|javascript:|onerror=/i.test(description)) {
    throw new ValidationError(
      "Description contains invalid content",
      "description",
    );
  }
}

/**
 * Validate price
 */
export function validatePrice(price: number): void {
  if (typeof price !== "number" || isNaN(price)) {
    throw new ValidationError("Price must be a number", "price");
  }

  if (price < 0) {
    throw new ValidationError("Price cannot be negative", "price");
  }

  if (price > 1000000) {
    throw new ValidationError("Price is too high", "price");
  }

  // Check for reasonable precision (2 decimal places)
  if (price.toFixed(2) !== price.toString()) {
    throw new ValidationError(
      "Price can have at most 2 decimal places",
      "price",
    );
  }
}

/**
 * Validate array of image URLs
 */
export function validateImages(images: string[]): void {
  if (!Array.isArray(images)) {
    throw new ValidationError("Images must be an array", "images");
  }

  if (images.length === 0) {
    throw new ValidationError("At least one image is required", "images");
  }

  const maxImages = parseInt(process.env.NEXT_PUBLIC_MAX_IMAGES || "10", 10);
  if (images.length > maxImages) {
    throw new ValidationError(`Too many images (max ${maxImages})`, "images");
  }

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    if (typeof image !== "string") {
      throw new ValidationError(
        `Image at index ${i} must be a string`,
        "images",
      );
    }

    // Validate URL format
    try {
      const url = new URL(image);
      if (!["http:", "https:", "data:"].includes(url.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      throw new ValidationError(
        `Image at index ${i} is not a valid URL`,
        "images",
      );
    }
  }
}

/**
 * Validate condition
 */
export function validateCondition(condition: string): void {
  const validConditions = ["new", "like_new", "good", "fair", "poor"] as const;

  if (!condition || typeof condition !== "string") {
    throw new ValidationError("Condition is required", "condition");
  }

  if (
    !validConditions.includes(condition as (typeof validConditions)[number])
  ) {
    throw new ValidationError(
      `Invalid condition. Must be one of: ${validConditions.join(", ")}`,
      "condition",
    );
  }
}

/**
 * Sanitize string input (remove dangerous characters)
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  return input
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/onerror=/gi, "");
}

/**
 * Validate request body exists and is valid JSON
 */
export async function validateRequestBody(
  request: Request,
): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      throw new ValidationError("Request body must be a valid JSON object");
    }

    return body;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError("Invalid JSON in request body");
  }
}

/**
 * Validate support ticket category
 */
export function validateSupportCategory(category: string): void {
  const validCategories = [
    "general",
    "technical",
    "billing",
    "feature",
    "bug",
    "account",
  ] as const;

  if (!category || typeof category !== "string") {
    throw new ValidationError("Category is required", "category");
  }

  if (!validCategories.includes(category as (typeof validCategories)[number])) {
    throw new ValidationError(
      `Invalid category. Must be one of: ${validCategories.join(", ")}`,
      "category",
    );
  }
}

/**
 * Create error response from validation error
 */
export function createValidationErrorResponse(
  error: ValidationError,
): Response {
  return new Response(
    JSON.stringify({
      error: error.message,
      field: error.field,
    }),
    {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

/**
 * Wrap handler with validation error handling
 */
export function withValidation(
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      if (error instanceof ValidationError) {
        return createValidationErrorResponse(error);
      }
      throw error;
    }
  };
}
