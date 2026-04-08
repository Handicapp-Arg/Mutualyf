export interface IConversation {
  id?: number;
  userId: number;
  startedAt: Date;
  endedAt?: Date;
}
