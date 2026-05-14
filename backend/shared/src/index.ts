// ── Utils ──
export {
  successResponse,
  createdResponse,
  paginatedResponse,
  errorResponse,
} from './utils/api-response.js';
export type { ApiResponse, PaginatedData } from './utils/api-response.js';

export {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
} from './utils/errors.js';

export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  hashToken,
  ACCESS_TOKEN_EXPIRES_IN,
} from './utils/jwt.js';
export type { TokenPayload } from './utils/jwt.js';

export { hashPassword, comparePassword, validatePasswordFormat } from './utils/password.js';

export { default as logger } from './utils/logger.js';
export { default as prisma } from './utils/prisma.js';

// ── Middleware ──
export { authenticate } from './middleware/auth.js';
export { errorHandler } from './middleware/error-handler.js';
export {
  createRateLimiter,
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  orderLimiter,
  generalLimiter,
} from './middleware/rate-limiter.js';
export { validate } from './middleware/validate.js';

// ── Repository ──
export { userRepository } from './repository/user-repository.js';
export { demandRepository } from './repository/demand-repository.js';
export type { DemandFilter } from './repository/demand-repository.js';
export { orderRepository } from './repository/order-repository.js';
export type { OrderFilter } from './repository/order-repository.js';
export { refreshTokenRepository } from './repository/refresh-token-repository.js';
export { demandImageRepository } from './repository/demand-image-repository.js';

// ── Types (side-effect: extends Express.Request, picked up via tsconfig include) ──
