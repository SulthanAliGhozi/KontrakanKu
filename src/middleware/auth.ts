import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: string;
    name?: string;
    picture?: string;
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses Ditolak: Token tidak ditemukan' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_dev_key') as any;
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
      picture: decoded.picture
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Akses Ditolak: Token tidak valid atau kadaluarsa' });
  }
};
