import { IRPCError } from '../mongo';

export interface IRPCErrorDAO {
  save(rpcErrorData: IRPCError): Promise<void>
}
