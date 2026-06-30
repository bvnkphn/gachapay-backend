import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SupportService } from './support.service';

@ApiTags('Support User')
@Controller('support')
export class SupportUserController {
  constructor(private supportService: SupportService) {}

  @Post('tickets')
  async createTicket(
    @Body() body: {
      name: string;
      email: string;
      subject: string;
      category?: string;
      orderId?: string;
      message: string;
      imageUrl?: string;
      userId?: string;
    },
  ) {
    return this.supportService.createTicket(body);
  }
}
