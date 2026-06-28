import {
    Controller, Get, Post, Patch, Body, Query, Param, Req,
    UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TopupService } from './topup.service';
import { CreateTopupDto } from './dto/create-topup.dto';

@Controller('topup')
@UseGuards(JwtAuthGuard)
export class TopupController {
    constructor(private topupService: TopupService) { }

    @Get('methods')
    getMethods() {
        return this.topupService.getMethods();
    }

    @Get('transactions')
    getTransactions(
        @Req() req,
        @Query('status') status?: string,
        @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
        @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
    ) {
        return this.topupService.getTransactions(req.user.id, status, limit, offset);
    }

    @Post('create-intent')
    createIntent(@Req() req, @Body() dto: CreateTopupDto) {
        return this.topupService.createIntent(req.user.id, dto);
    }

    // DEV: simulate complete/cancel for testing without real gateway
    @Patch(':referenceId/complete')
    simulateComplete(@Param('referenceId') referenceId: string, @Req() req) {
        return this.topupService.simulateComplete(referenceId, req.user.id);
    }

    @Patch(':referenceId/cancel')
    simulateCancel(@Param('referenceId') referenceId: string, @Req() req) {
        return this.topupService.simulateCancel(referenceId, req.user.id);
    }

    @Patch(':referenceId/submit-slip')
    submitSlip(
        @Param('referenceId') referenceId: string,
        @Req() req,
        @Body() body: { slipUrl: string; bankCode?: string },
    ) {
        return this.topupService.submitSlip(referenceId, req.user.id, body.slipUrl, body.bankCode);
    }
}
