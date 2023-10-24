import {
    BlockHeader,
    DataHandlerContext,
    EvmBatchProcessor,
    EvmBatchProcessorFields,
    Log as _Log,
    Transaction as _Transaction,
} from '@subsquid/evm-processor'
import { bridgeEventAddresses, bridgeTopics } from './bridges'


export const processor = new EvmBatchProcessor()
    .setDataSource({
        // Must be set for RPC ingestion (https://docs.subsquid.io/evm-indexing/evm-processor/)
        // OR to enable contract state queries (https://docs.subsquid.io/evm-indexing/query-state/)
        chain: 'https://pacific-rpc.manta.network/http',
    })
    .setFinalityConfirmation(75)
    .addLog({
        address: bridgeEventAddresses,
        topic0: bridgeTopics,
        transaction: true,
    })
    .setFields({
        transaction: {
            from: true,
            value: true,
            hash: true,
            gas: true,
        },
    })
    .setBlockRange({
        from: 0,
    })
    .addTransaction({
    })

export type Fields = EvmBatchProcessorFields<typeof processor>
export type Block = BlockHeader<Fields>
export type Log = _Log<Fields>
export type Transaction = _Transaction<Fields>
export type ProcessorContext<Store> = DataHandlerContext<Store, Fields>
