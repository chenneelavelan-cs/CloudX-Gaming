import { AuthPayload } from '../modules/auth/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export {};
