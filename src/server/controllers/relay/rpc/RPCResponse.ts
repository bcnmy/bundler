export abstract class RPCResponse {
  constructor(
    public id = 1,
    public jsonprc = "2.0",
  ) {}
}
