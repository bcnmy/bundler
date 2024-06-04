import { Gauge, Registry } from "prom-client";
import { IMonitoringService } from "./interface";
import { GaugeConfig } from "./types";
import { registry } from "./Registry";

export class MonitoringService implements IMonitoringService {
    private registry: Registry;

    private gauges: Map<string, Gauge<string>>;
  
    constructor() {
      this.registry = registry;
      this.gauges = new Map();
    }
  
    createGauge(config: GaugeConfig): Gauge<string> {
      const gauge = new Gauge({
        name: config.name,
        help: config.help,
        labelNames: config.labelNames || [],
        registers: [this.registry],
      });
      this.gauges.set(config.name, gauge);
      return gauge;
    }
  
    getGauge(name: string): Gauge<string> | undefined {
      return this.gauges.get(name);
    }
  
    incrementGauge(name: string, labels: Record<string, string>, value: number = 1): void {
      const gauge = this.getGauge(name);
      if (gauge) {
        gauge.inc(labels, value);
      } else {
        throw new Error(`Gauge with name ${name} does not exist`);
      }
    }
  
    decrementGauge(name: string, labels: Record<string, string>, value: number = 1): void {
      const gauge = this.getGauge(name);
      if (gauge) {
        gauge.dec(labels, value);
      } else {
        throw new Error(`Gauge with name ${name} does not exist`);
      }
    }
}