/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { SessionData, UserRole } from '../../shared/types';

// Extend Express Request type definitions to support session property
declare global {
  namespace Express {
    interface Request {
      session?: SessionData;
    }
  }
}

/**
 * Middleware to require authenticated session
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionCookie = req.signedCookies ? req.signedCookies.sid : null;

  if (!sessionCookie) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Sessão expirada ou não autenticada. Por favor, faça login novamente.'
    });
  }

  try {
    const session: SessionData = typeof sessionCookie === 'string' 
      ? JSON.parse(sessionCookie) 
      : sessionCookie;

    if (!session || !session.userId || !session.familyId) {
      return res.status(401).json({
        error: 'INVALID_SESSION',
        message: 'Assinatura de sessão inválida. Por favor, faça login novamente.'
      });
    }

    req.session = session;
    next();
  } catch (err) {
    res.clearCookie('sid');
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Falha ao decodificar sessão ativa.'
    });
  }
}

/**
 * Middleware to require administrator privileges
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (req.session?.role !== UserRole.ADMIN) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Apenas administradores da família possuem permissão para realizar esta ação.'
      });
    }
    next();
  });
}

/**
 * Global error handler middleware
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('❌ Express server unhandled error:', err);
  
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Ocorreu um erro interno inesperado no servidor.';
  
  res.status(status).json({
    error: 'INTERNAL_SERVER_ERROR',
    message,
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

/**
 * Simple, memory-based Rate Limiter to protect endpoints (like login/first-use)
 */
const ipRequests = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    const now = Date.now();
    const record = ipRequests.get(ip);

    if (!record || now > record.resetTime) {
      ipRequests.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    record.count++;
    if (record.count > limit) {
      return res.status(429).json({
        error: 'TOO_MANY_REQUESTS',
        message: 'Múltiplas requisições consecutivas detectadas. Por favor, aguarde alguns minutos antes de tentar novamente.'
      });
    }

    next();
  };
}
