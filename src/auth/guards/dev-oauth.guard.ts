import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DevOrGoogleAuthGuard extends AuthGuard('google') {
    constructor(private configService: ConfigService) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isDev = this.configService.get('NODE_ENV') !== 'production';
        const clientId = this.configService.get('GOOGLE_CLIENT_ID');
        if (isDev && (!clientId || clientId.includes('YOUR_GOOGLE') || clientId === 'your-google-client-id')) {
            const request = context.switchToHttp().getRequest();
            request.user = {
                id: 'mock-google-id-12345',
                displayName: 'Mock Google User',
                emails: [{ value: 'mock_google@gachapay.com' }],
                photos: [{ value: 'https://api.dicebear.com/7.x/adventurer/svg?seed=mock_google' }]
            };
            return true;
        }
        try {
            return await (super.canActivate(context) as Promise<boolean>);
        } catch (err) {
            // If passport fails, fallback to mock in development
            if (isDev) {
                const request = context.switchToHttp().getRequest();
                request.user = {
                    id: 'mock-google-id-12345',
                    displayName: 'Mock Google User (Fallback)',
                    emails: [{ value: 'mock_google@gachapay.com' }],
                    photos: [{ value: 'https://api.dicebear.com/7.x/adventurer/svg?seed=mock_google' }]
                };
                return true;
            }
            throw err;
        }
    }
}

@Injectable()
export class DevOrFacebookAuthGuard extends AuthGuard('facebook') {
    constructor(private configService: ConfigService) {
        super();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isDev = this.configService.get('NODE_ENV') !== 'production';
        const appId = this.configService.get('FACEBOOK_APP_ID');
        if (isDev && (!appId || appId.includes('YOUR_FACEBOOK') || appId === 'your-facebook-app-id')) {
            const request = context.switchToHttp().getRequest();
            request.user = {
                id: 'mock-facebook-id-12345',
                displayName: 'Mock Facebook User',
                emails: [{ value: 'mock_facebook@gachapay.com' }],
                photos: [{ value: 'https://api.dicebear.com/7.x/adventurer/svg?seed=mock_facebook' }]
            };
            return true;
        }
        try {
            return await (super.canActivate(context) as Promise<boolean>);
        } catch (err) {
            // If passport fails, fallback to mock in development
            if (isDev) {
                const request = context.switchToHttp().getRequest();
                request.user = {
                    id: 'mock-facebook-id-12345',
                    displayName: 'Mock Facebook User (Fallback)',
                    emails: [{ value: 'mock_facebook@gachapay.com' }],
                    photos: [{ value: 'https://api.dicebear.com/7.x/adventurer/svg?seed=mock_facebook' }]
                };
                return true;
            }
            throw err;
        }
    }
}
