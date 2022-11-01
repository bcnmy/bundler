import { MongoClient } from 'mongodb'
import { appConfig } from "../..";
import { Request, Response } from 'express';

export class Mongo {
    constructor() {

    }

    async checkStatus(): Promise<any> {
        const MONGO_USERNAME = appConfig?.mongo?.username;
        const MONGO_PASSWORD = appConfig?.mongo?.password;
        const MONGO_DB = appConfig?.mongo?.dbName;
        const MONGO_HOSTNAME = appConfig?.mongo?.host;
        const MONGO_PORT = appConfig?.mongo?.port;

        const url = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOSTNAME}:${MONGO_PORT}/${MONGO_DB}`;

        const client = new MongoClient(url);
        // Use connect method to connect to the server
        return new Promise((resolve, reject) => {
            client.connect().then(() => {
                console.log('Connected successfully to server');
                resolve({
                    status: true
                });
            })
                .catch((error) => {
                    resolve({
                        status: false,
                        error,
                    });
                })
                .finally(() => {
                    client.close();
                });
        });
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
