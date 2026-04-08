import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class FeedbackGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Implement feedback-specific guard logic here
    return true;
  }
}
