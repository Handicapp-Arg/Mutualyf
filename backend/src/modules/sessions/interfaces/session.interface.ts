export interface ISession {
  id?: number;
  userId: number;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}
