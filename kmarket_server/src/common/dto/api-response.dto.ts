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
