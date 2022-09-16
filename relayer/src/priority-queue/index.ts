export interface PriorityQueue<T> {
    insert(item: T, priority?: number): void
    peek(): T
    pop(): T
    size(): number
    isEmpty(): boolean
};
