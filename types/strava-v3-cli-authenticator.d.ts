declare module 'strava-v3-cli-authenticator' {

    type StravaAuthenticatorCallback = (error: any, authToken: string) => void;

    interface StravaAuthenticatorOptions {
        clientId: number;
        clientSecret: string;
        scope: 'public' | 'write' | 'view_private' | 'view_private,write';
        httpPort: number;
    }

    function authorize(options: StravaAuthenticatorOptions, callback: StravaAuthenticatorCallback): void;

    export = authorize;
}