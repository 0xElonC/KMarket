import { Module, forwardRef } from '@nestjs/common';
import { ChainController } from './chain.controller';
import {
    ProviderService,
    DepositListenerService,
    WithdrawSignerService,
    SignatureVerifyService,
    ChainQueryService,
} from './services';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [forwardRef(() => UsersModule)],
    controllers: [ChainController],
    providers: [
        ProviderService,
        DepositListenerService,
        WithdrawSignerService,
        SignatureVerifyService,
        ChainQueryService,
    ],
    exports: [
        ProviderService,
        WithdrawSignerService,
        SignatureVerifyService,
        ChainQueryService,
    ],
})
export class ChainModule { }
