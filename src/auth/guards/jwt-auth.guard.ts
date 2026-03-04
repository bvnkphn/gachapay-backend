import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // ถ้ายังไม่มี JWT module ให้ผ่านได้เลย (แก้ทีหลังเมื่อเปิด auth)
  canActivate(context: ExecutionContext) {
    return true;
  }
}
