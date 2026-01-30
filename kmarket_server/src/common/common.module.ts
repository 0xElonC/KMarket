import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config';

@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
        }),
    ],
    exports: [ConfigModule],
})
export class CommonModule { }
