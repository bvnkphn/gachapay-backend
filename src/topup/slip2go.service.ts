import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class Slip2goService {
    private readonly logger = new Logger(Slip2goService.name);
    private readonly apiKey = process.env.SLIP2GO_API_KEY || '';
    private readonly baseUrl = process.env.SLIP2GO_BASE_URL || 'https://connect.slip2go.com/api/verify-slip/qr-image/info';

    async verifySlip(imageUrl: string, amount: number | string, referenceId: string) {
        try {
            const body = {
                image: imageUrl,
                amount: Number(amount),
                reference: referenceId,
            };

            const headers: any = { 'Content-Type': 'application/json' };
            if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

            const resp = await fetch(this.baseUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });

            const data = await resp.json().catch(() => null);
            if (!resp.ok) {
                this.logger.warn(`Slip2Go verification failed status=${resp.status} body=${JSON.stringify(data)}`);
            } else {
                this.logger.debug(`Slip2Go response status=${resp.status} ok=${resp.ok}`);
            }
            this.logger.debug(`Slip2Go response body=${JSON.stringify(data)}`);
            return { ok: resp.ok, status: resp.status, data };
        } catch (err) {
            this.logger.error('verifySlip failed', err as any);
            return { ok: false, error: (err as any).message || 'unknown error' };
        }
    }
}
