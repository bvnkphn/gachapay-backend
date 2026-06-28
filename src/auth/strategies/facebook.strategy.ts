import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
    constructor(private configService: ConfigService) {
        super({
            clientID: configService.get('FACEBOOK_APP_ID') || 'mock-facebook-client-id',
            clientSecret: configService.get('FACEBOOK_APP_SECRET') || 'mock-facebook-client-secret',
            callbackURL: configService.get('FACEBOOK_CALLBACK_URL') || 'http://localhost:3001/auth/facebook/callback',
            scope: ['public_profile'],
            profileFields: ['id', 'displayName', 'photos'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: (err: any, user: any, info?: any) => void,
    ): Promise<any> {
        done(null, profile);
    }
}
