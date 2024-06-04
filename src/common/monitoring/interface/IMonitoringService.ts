import { Gauge } from 'prom-client';
import { GaugeConfig } from '../types/index';

export interface IMonitoringService {
    createGauge(config: GaugeConfig): Gauge
    getGauge(name: string): Gauge<string> | undefined
    incrementGauge(name: string, labels: Record<string, string>, value: number): void
    decrementGauge(name: string, labels: Record<string, string>, value: number): void
}