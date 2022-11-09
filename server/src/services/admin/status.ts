export class Status {
  public static async getStatus(): Promise<StatusResponse> {
    const status: StatusResponse = {
      status: 'ok',
      version: '0.0.0',
    };

    return status;
  }
  
}
