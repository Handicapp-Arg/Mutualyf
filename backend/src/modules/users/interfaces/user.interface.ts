export interface IUser {
  id?: number;
  ipAddress: string;
  fingerprint: string;
  userName?: string;
  userAgent?: string;
  timezone?: string;
  language?: string;
  firstVisit: Date;
  lastVisit: Date;
  visitCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
