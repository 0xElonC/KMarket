import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
    userId: number;
    address: string;
}

export const CurrentUser = createParamDecorator(
    (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext): CurrentUserPayload | string | number | undefined => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as CurrentUserPayload;

        if (!user) return undefined;
        return data ? user[data] : user;
    },
);
