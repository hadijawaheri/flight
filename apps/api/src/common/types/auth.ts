import type { Role } from "@flysmart/contracts";
import type { Request } from "express";

export interface AuthUser {
  id: string;
  role: Role;
}

export interface JwtPayload {
  sub: string;
  role: Role;
}

export interface AuthedRequest extends Request {
  user: AuthUser;
}
