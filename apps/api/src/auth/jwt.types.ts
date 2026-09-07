export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

export interface RefreshTokenPayload {
  sub: string;
}
