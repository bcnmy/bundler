export interface ICacheService {
  get(key: string): Promise<string>
  set(key: string): Promise<string>
  increment(key: string, incrementBy ?: number): Promise<string>
  decrement(key: string, decrementBy ?: number): Promise<string>
  expire(key: string, expiryTime: number): Promise<string>
  delete(key: string): Promise<void>
}
