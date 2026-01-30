import { IsInt, IsOptional, Min, Max } from 'class-validator';
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

export class PaginatedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;

    constructor(items: T[], total: number, page: number, limit: number) {
        this.items = items;
        this.total = total;
        this.page = page;
        this.limit = limit;
        this.totalPages = Math.ceil(total / limit);
    }
}
