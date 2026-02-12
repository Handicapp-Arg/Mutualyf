export interface IFeedback {
  id?: number;
  userId: number;
  conversationId: number;
  rating: number;
  comment?: string;
  createdAt: Date;
}
