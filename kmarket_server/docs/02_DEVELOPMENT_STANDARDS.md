# KMarket Backend 开发规范文档

> 基于 NestJS 的 RESTful API 后端服务开发标准

---

## 1. 项目结构规范

### 1.1 目录结构

```
src/
├── common/                    # 全局共享模块
│   ├── config/               # 配置文件
│   ├── decorators/           # 自定义装饰器
│   ├── dto/                  # 通用 DTO
│   ├── filters/              # 异常过滤器
│   ├── guards/               # 认证守卫
│   ├── interceptors/         # 拦截器
│   ├── pipes/                # 管道
│   └── utils/                # 工具函数
│
├── [module-name]/             # 业务模块 (每个模块独立目录)
│   ├── dto/                  # 模块专用 DTO
│   │   ├── create-xxx.dto.ts
│   │   ├── update-xxx.dto.ts
│   │   └── index.ts
│   ├── entities/             # 数据库实体
│   │   ├── xxx.entity.ts
│   │   └── index.ts
│   ├── services/             # 服务层 (可多个)
│   │   ├── xxx.service.ts
│   │   └── index.ts
│   ├── [module-name].controller.ts
│   ├── [module-name].module.ts
│   └── index.ts              # Barrel export
│
├── app.module.ts             # 根模块
└── main.ts                   # 应用入口
```

### 1.2 命名规范

| 类型 | 命名规则 | 示例 |
|------|----------|------|
| **文件名** | kebab-case | `user-profile.service.ts` |
| **类名** | PascalCase | `UserProfileService` |
| **方法名** | camelCase | `getUserById()` |
| **常量** | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| **接口** | PascalCase + I 前缀(可选) | `UserProfile` 或 `IUserProfile` |
| **枚举** | PascalCase | `UserStatus` |
| **DTO** | PascalCase + Dto 后缀 | `CreateUserDto` |
| **Entity** | PascalCase + Entity 后缀(可选) | `User` 或 `UserEntity` |

---

## 2. 模块开发规范

### 2.1 模块定义

```typescript
// users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],  // 仅导出需要被其他模块使用的服务
})
export class UsersModule {}
```

### 2.2 Barrel Export (index.ts)

每个模块目录必须包含 `index.ts` 用于统一导出：

```typescript
// users/index.ts
export * from './users.module';
export * from './users.service';
export * from './entities';
export * from './dto';
```

---

## 3. Controller 规范

### 3.1 基本结构

```typescript
import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ApiResponse, PaginationDto } from '../common/dto';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';

@Controller('users')          // 路由前缀
@UseGuards(JwtAuthGuard)      // 全局守卫 (可选)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /api/users
  @Get()
  async findAll(@Query() pagination: PaginationDto): Promise<ApiResponse<User[]>> {
    const data = await this.usersService.findAll(pagination);
    return ApiResponse.success(data);
  }

  // GET /api/users/:id
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ApiResponse<User>> {
    const data = await this.usersService.findOne(+id);
    return ApiResponse.success(data);
  }

  // POST /api/users
  @Post()
  async create(@Body() dto: CreateUserDto): Promise<ApiResponse<User>> {
    const data = await this.usersService.create(dto);
    return ApiResponse.success(data, 'User created successfully');
  }

  // PUT /api/users/:id
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<ApiResponse<User>> {
    const data = await this.usersService.update(+id, dto);
    return ApiResponse.success(data);
  }

  // DELETE /api/users/:id
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<ApiResponse<void>> {
    await this.usersService.remove(+id);
    return ApiResponse.success(null, 'User deleted successfully');
  }
}
```

### 3.2 RESTful 路由设计

| HTTP 方法 | 路径 | 用途 | 示例 |
|-----------|------|------|------|
| `GET` | `/resources` | 获取资源列表 | `GET /api/users` |
| `GET` | `/resources/:id` | 获取单个资源 | `GET /api/users/123` |
| `POST` | `/resources` | 创建资源 | `POST /api/users` |
| `PUT` | `/resources/:id` | 完整更新资源 | `PUT /api/users/123` |
| `PATCH` | `/resources/:id` | 部分更新资源 | `PATCH /api/users/123` |
| `DELETE` | `/resources/:id` | 删除资源 | `DELETE /api/users/123` |

**嵌套资源示例**:
```
GET    /api/users/:userId/orders          # 用户的所有订单
GET    /api/users/:userId/orders/:orderId # 用户的单个订单
POST   /api/users/:userId/orders          # 为用户创建订单
```

---

## 4. Service 规范

### 4.1 基本结构

```typescript
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,  // 用于事务
  ) {}

  async findAll(pagination: PaginationDto): Promise<{ items: User[]; total: number }> {
    const [items, total] = await this.userRepository.findAndCount({
      skip: pagination.skip,
      take: pagination.limit,
      order: { createdAt: 'DESC' },
    });
    return { items, total };
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(dto);
    return this.userRepository.save(user);
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  // 事务示例
  async transferBalance(fromId: number, toId: number, amount: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const from = await manager.findOne(User, {
        where: { id: fromId },
        lock: { mode: 'pessimistic_write' },
      });
      const to = await manager.findOne(User, {
        where: { id: toId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!from || !to) throw new NotFoundException('User not found');
      if (from.balance < amount) throw new BadRequestException('Insufficient balance');

      from.balance -= amount;
      to.balance += amount;

      await manager.save([from, to]);
    });
  }
}
```

### 4.2 服务层原则

1. **单一职责**: 每个 Service 只负责一个领域的业务逻辑
2. **异常处理**: 使用 NestJS 内置异常类 (`NotFoundException`, `BadRequestException` 等)
3. **日志记录**: 关键操作使用 `Logger` 记录
4. **事务管理**: 涉及多表操作时使用 `DataSource.transaction()`
5. **不处理 HTTP**: Service 不应该知道 HTTP 相关概念 (如 Request, Response)

---

## 5. DTO 规范

### 5.1 创建 DTO

```typescript
// dto/create-user.dto.ts
import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @MinLength(3)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  username: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}
```

### 5.2 更新 DTO (使用 PartialType)

```typescript
// dto/update-user.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// 所有字段可选，排除 password
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {}
```

### 5.3 分页 DTO

```typescript
// common/dto/pagination.dto.ts
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }
}
```

---

## 6. Entity 规范

### 6.1 基本实体

```typescript
// entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

@Entity('users')  // 表名使用复数
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  @Index()
  username: string;

  @Column({ length: 255, unique: true })
  @Index()
  email: string;

  @Column({ length: 255, select: false })  // 默认不查询密码
  password: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: '0' })
  balance: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // 关联关系
  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];
}
```

### 6.2 枚举类型

```typescript
// entities/order.entity.ts
export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  @Index()
  status: OrderStatus;

  // ...
}
```

---

## 7. API 响应规范

### 7.1 统一响应格式

```typescript
// common/dto/api-response.dto.ts
export class ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;

  constructor(partial: Partial<ApiResponse<T>>) {
    Object.assign(this, partial);
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data: T, message?: string): ApiResponse<T> {
    return new ApiResponse({ success: true, data, message });
  }

  static error<T>(error: string, message?: string): ApiResponse<T> {
    return new ApiResponse({ success: false, error, message });
  }
}
```

### 7.2 响应示例

**成功响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  },
  "message": "User created successfully",
  "timestamp": "2024-01-28T10:30:00.000Z"
}
```

**分页响应**:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  },
  "timestamp": "2024-01-28T10:30:00.000Z"
}
```

**错误响应**:
```json
{
  "success": false,
  "statusCode": 404,
  "error": "NotFoundException",
  "message": "User #123 not found",
  "path": "/api/users/123",
  "timestamp": "2024-01-28T10:30:00.000Z"
}
```

---

## 8. 异常处理规范

### 8.1 全局异常过滤器

```typescript
// common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'UnknownError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      message = res.message || exception.message;
      error = res.error || exception.name;
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 8.2 常用异常类

| 异常类 | HTTP 状态码 | 使用场景 |
|--------|-------------|----------|
| `BadRequestException` | 400 | 请求参数错误 |
| `UnauthorizedException` | 401 | 未认证 |
| `ForbiddenException` | 403 | 无权限 |
| `NotFoundException` | 404 | 资源不存在 |
| `ConflictException` | 409 | 资源冲突 (如重复) |
| `UnprocessableEntityException` | 422 | 业务逻辑错误 |
| `InternalServerErrorException` | 500 | 服务器内部错误 |

---

## 9. 认证与授权

### 9.1 JWT 认证守卫

```typescript
// common/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

### 9.2 公开路由装饰器

```typescript
// common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../guards/jwt-auth.guard';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**使用示例**:
```typescript
@Controller('auth')
export class AuthController {
  @Public()  // 此路由不需要认证
  @Post('login')
  login() { ... }
}
```

---

## 10. 配置管理

### 10.1 环境变量

```typescript
// common/config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'kmarket',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'change-me-in-production',
    expiresIn: 604800, // 7 days in seconds
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
});
```

### 10.2 .env 文件示例

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=kmarket

# JWT
JWT_SECRET=your-super-secret-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 11. 代码风格

### 11.1 TypeScript 配置

确保 `tsconfig.json` 启用严格模式:

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  }
}
```

### 11.2 ESLint 规则

重要规则:
- 使用 `import type` 导入仅用于类型的模块
- 禁止使用 `any`，必要时使用 `unknown`
- 异步函数必须正确处理 Promise

### 11.3 格式化

使用 Prettier 统一格式:

```json
// .prettierrc
{
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 100
}
```

---

## 12. API 文档 (Swagger)

### 12.1 安装

```bash
npm install @nestjs/swagger swagger-ui-express
```

### 12.2 配置

```typescript
// main.ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('KMarket API')
  .setDescription('KMarket 后端 API 文档')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('docs', app, document);
```

### 12.3 DTO 文档装饰器

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: '用户名', example: 'johndoe' })
  username: string;

  @ApiPropertyOptional({ description: '头像 URL' })
  avatar?: string;
}
```

---

## 13. 测试规范

### 13.1 单元测试

```typescript
// users.service.spec.ts
describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### 13.2 E2E 测试

```typescript
// test/users.e2e-spec.ts
describe('UsersController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/users (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/users')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
      });
  });
});
```

---

## 附录: 常用命令速查

```bash
# 创建模块
nest g module users

# 创建控制器
nest g controller users --no-spec

# 创建服务
nest g service users --no-spec

# 创建资源 (包含 CRUD)
nest g resource users

# 运行开发模式
npm run start:dev

# 构建生产版本
npm run build

# 运行测试
npm run test
npm run test:e2e
npm run test:cov
```
