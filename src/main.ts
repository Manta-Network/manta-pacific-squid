import { DataHandlerContext } from '@subsquid/evm-processor';
import {Store, TypeormDatabase} from '@subsquid/typeorm-store'
import {DailyTx, HourlyTx, DailyActiveWallet,  CumulativeWallets, ContractDailyInteraction} from './model'
import {processor} from './processor'
import {isZeroAddress} from './utils'

let currDay: Date | undefined = undefined;
let endHour: Date | undefined = undefined;
let endDay: Date | undefined = undefined;
let walletSet: Set<string> = new Set();
const bridgeAddresses: Array<ContractAddress> = [
    {name: "Polyhedra", addresses: ["0xCE0e4e4D2Dc0033cE2dbc35855251F4F3D086D0A".toLowerCase()]},
    {
        name: "Orbiter",
        addresses: [
            "0x80C67432656d59144cEFf962E8fAF8926599bCF8".toLowerCase(),
            "0xE4eDb277e41dc89aB076a1F049f4a3EfA700bCE8".toLowerCase(),
        ],
    },
    {
        name: "LayerSwap",
        addresses: [
            "0x2Fc617E933a52713247CE25730f6695920B3befe".toLowerCase(),
        ]
    },
    {
        name: "Owlto",
        addresses: [
           "0x45A318273749d6eb00f5F6cA3bC7cD3De26D642A".toLowerCase()
        ]
    },
    {
        name: "Meson",
        addresses: [
            "0x25aB3Efd52e6470681CE037cD546Dc60726948D3".toLowerCase()
        ]
    },
    {
        name: "RhinoFi",
        addresses: [
            "0x2B4553122D960CA98075028d68735cC6b15DeEB5".toLowerCase()
        ]
    },
    {
        name: "DappOS",
        addresses: [
            "0x1350AF2F8E74633816125962F3DB041e620C1037".toLowerCase()
        ]
    },
    {
        name: "Native",
        addresses: [
            "0x4200000000000000000000000000000000000010".toLowerCase()
        ]
    }
];

type ContractAddress = {
    name: string,
    addresses: Array<string>
};

const SupportBridges = [
  "Polyhedra",
  "Orbiter",
  "LayerSwap",
  "Owlto",
  "Meson",
  "RhinoFi",
  "DappOS",
  "Native",
] as const;

const recordAddresses = addressHashMap(bridgeAddresses);

processor.run(new TypeormDatabase({supportHotBlocks: true}), async (ctx) => {
    // load current values from db
    const [dailyTx, hourlyTx, dailyActive, contractDailyInteraction]  = await init_values(ctx);

    for (let c of ctx.blocks) {
        const blockDate = new Date(c.header.timestamp);
        // init value for first loop
        if (currDay === undefined) {
            currDay = new Date(blockDate);
        }
        if (endDay === undefined) {
            let val = await ctx.store.get(DailyTx, {where: {id: "0"}})
            if (val === undefined) {
                endDay = new Date(blockDate.getTime() + (1000 * 60 * 60 * 24));
            } else {
                endDay = val.date;
            }
        }
        if (endHour === undefined) {
            let val = await ctx.store.get(HourlyTx, {where: {id: "0"}})
            if (val === undefined) {
                endHour = new Date(blockDate.getTime() + (1000 * 60 * 60));
            } else {
                endHour = val.date;
            }
        }

        currDay.setTime(blockDate.getTime());
        dailyTx.date.setTime(endDay.getTime());
        hourlyTx.date.setTime(endHour.getTime());
        dailyActive.date.setTime(endDay.getTime());
        for (const name in contractDailyInteraction) {
            const contractInteraction = contractDailyInteraction[name]
            if (contractInteraction) {
                contractInteraction.date.setTime(endDay.getTime());
                contractDailyInteraction[name] = contractInteraction;
            }
        }

        for (let tx of c.transactions) {
            // increment daily tx
            dailyTx.txNum++;
            // increment hourly tx
            hourlyTx.txNum++;
            walletSet.add(tx.from);
            if (tx.to) {
                const contractName = recordAddresses[tx.to];
                let contractTx = contractDailyInteraction[contractName];
                if (contractTx) {
                    contractTx.txNum++;
                    contractDailyInteraction[contractName] = contractTx;
                }
            }
        }

        if (currDay > endHour) {
            ctx.log.info(`new hour started! previous hour tx volume ${hourlyTx.txNum}`);
            hourlyTx.id = c.header.id;
            await ctx.store.upsert(hourlyTx);
            endHour.setTime(endHour.getTime() + (1000 * 60 * 60));

            // reset hourly tx number to zero
            hourlyTx.txNum = 0;
            hourlyTx.id = "0";
            // update cumulative wallets
            await ctx.store.upsert([...walletSet.values()].map((x)=> {
                return new CumulativeWallets({id: x})
            }));

            // update most current data hourly
            dailyActive.id = "0";
            dailyActive.activeWallet = walletSet.size;
            dailyActive.cumulativeUsers = await ctx.store.count(CumulativeWallets);

            await ctx.store.upsert(dailyActive)
            await ctx.store.upsert(hourlyTx);
        } else {
            hourlyTx.id = "0";

            await ctx.store.upsert(hourlyTx);
        }

        if (currDay > endDay) {
            ctx.log.info(`new day started! previous day tx volume ${dailyTx.txNum}`);
            dailyTx.id = c.header.id;
            dailyActive.id = c.header.id;
            dailyActive.activeWallet = walletSet.size;
            dailyActive.cumulativeUsers = await ctx.store.count(CumulativeWallets);
            for (const name in contractDailyInteraction) {
                const contractInteraction = contractDailyInteraction[name];
                if (contractInteraction) {
                    contractInteraction.id = contractInteraction.name + c.header.id;
                    contractInteraction.cumulativeTx += contractInteraction.txNum;
                    ctx.log.info(`name: ${contractInteraction.name}, txNum: ${contractInteraction.txNum}`);
                    await ctx.store.upsert(contractInteraction);
                    contractInteraction.txNum = 0;
                    contractInteraction.id = contractInteraction.name + "0";
                    await ctx.store.upsert(contractInteraction);
                    contractDailyInteraction[name] = contractInteraction;
                }
            }

            await ctx.store.upsert(dailyActive)
            await ctx.store.upsert(dailyTx);
            // reset daily tx number to zero
            dailyTx.txNum = 0;
            endDay.setTime(currDay.getTime() + (1000 * 60 * 60 * 24));

            dailyTx.id = "0";
            dailyActive.id = "0";
            await ctx.store.upsert(dailyTx);
            await ctx.store.upsert(dailyActive);
            // reset daily users
            walletSet.clear();
        } else {
            dailyTx.id = "0";

            await ctx.store.upsert(dailyTx);

            for (const name in contractDailyInteraction) {
                const contractInteraction = contractDailyInteraction[name]
                if (contractInteraction) {
                    contractInteraction.id = contractInteraction.name + "0";
                    await ctx.store.upsert(contractInteraction);
                    contractDailyInteraction[name] = contractInteraction;
                }
            }
        }
    }
})

async function init_values(ctx: DataHandlerContext<Store, any>): Promise<[DailyTx, HourlyTx, DailyActiveWallet, Record<string, ContractDailyInteraction>]> {
    let initDailyTx = await ctx.store.get(DailyTx, {where: {id: "0"}});
    let initHourlyTx = await ctx.store.get(HourlyTx, {where: {id: "0"}});
    let initDailyActive = await ctx.store.get(DailyActiveWallet, {where: {id: "0"}});
    const initContracts: Record<string, ContractDailyInteraction> = {};

    for (const contract of bridgeAddresses) {
        let initContract = await ctx.store.get(ContractDailyInteraction, {where: {id: contract.name + "0"}});
        if (initContract === undefined) {
            initContract = new ContractDailyInteraction({
                id: contract.name + "0",
                name: contract.name,
                date: new Date(),
                txNum: 0,
                dailyGas: 0,
                cumulativeTx: 0,
                cumulativeGas: 0,
            });
        }
        initContracts[contract.name] = initContract;
    }

    if (initDailyTx === undefined) {
        initDailyTx = new DailyTx({
            id: "0",
            txNum: 0,
            date: new Date(),
        });
    }
    if (initHourlyTx === undefined) {
        initHourlyTx = new HourlyTx({
            id: "0",
            txNum: 0,
            date: new Date(),
        });
    }
    if (initDailyActive === undefined) {
        initDailyActive = new DailyActiveWallet({
            id: "0",
            activeWallet: 0,
            date: new Date(),
            cumulativeUsers: 0,
        })
    }

    return [initDailyTx, initHourlyTx, initDailyActive, initContracts];
}

function addressHashMap(contractArray: Array<ContractAddress>): Record<string, string> {
    const addressRecord = {} as Record<string, string>;
    contractArray.forEach((contract) => {
        contract.addresses.forEach((addr) => {
            addressRecord[addr] = contract.name
        })
    })
    return addressRecord;
}
