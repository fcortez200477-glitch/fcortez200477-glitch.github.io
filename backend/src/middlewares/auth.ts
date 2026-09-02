import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from '../utils/http-error';
import type { AuthUser, UserRole } from '../types/express';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  // Permite autenticacao alternativa via chave de servico para dispositivos de ingestao
  // (sensores de trafego / rastreadores veiculares), sem expor credenciais de usuario.
  const deviceKey = req.headers['x-device-key'];
  if (deviceKey && env.DEVICE_INGEST_API_KEY && deviceKey === env.DEVICE_INGEST_API_KEY) {
    req.user = { id: 'device', email: 'device@ingest.local', role: 'operator' };
    return next();
  }

  if (!header?.startsWith('Bearer ')) {
    return next(HttpError.unauthorized('Token de acesso ausente'));
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user: AuthUser = { id: payload.sub, email: payload.email, role: payload.role };
    req.user = user;
    return next();
  } catch {
    return next(HttpError.unauthorized('Token invalido ou expirado'));
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(HttpError.unauthorized());
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(HttpError.forbidden('Voce nao tem permissao para executar esta acao'));
    }
    return next();
  };
}
