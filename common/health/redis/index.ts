import { createClient } from "redis";
import { appConfig } from "../../../server/src/services";
import { Request, Response } from 'express';


export class Redis {
    constructor() {

    }

    async checkStatus(): Promise<any> {
        return new Promise((resolve, reject) => {
            const client = createClient({
                host: appConfig?.redis?.host,
                port: appConfig?.redis?.port,
            });
            client.on("error", (error: any) => {
                client.end(true);
                resolve({
                    status: false,
                    error,
                });
            });
            client.ping((status: any) => {
                client.end(true);
                resolve({
                    status: status === null,
                    error: status !== null ? status : undefined,
                });
            });
        })
    }

    health = async (req: Request, res: Response) => {
        const { status } = await this.checkStatus();
        if (status)
            return res.send({
                status
            });
        return res.status(503).send({
            status
        })
    }

}