export interface IStrategy<T> {
  doAlgorithm(data: T[]): T[];
}
