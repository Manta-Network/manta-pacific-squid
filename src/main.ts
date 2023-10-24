import { DataHandlerContext } from '@subsquid/evm-processor';
import {Store, TypeormDatabase} from '@subsquid/typeorm-store'
import {DailyTx, HourlyTx, DailyActiveWallet,  CumulativeWallets, ContractDailyInteraction} from './model'
import {processor} from './processor'
import { bridgeEventAddresses, bridgeTopics } from './bridges'

let currDay: Date | undefined = undefined;
let endHour: Date | undefined = undefined;
let endDay: Date | undefined = undefined;
let walletSet: Set<string> = new Set();

// for tracking using events, this is more ideal
const bridgeEventAddressses: Array<ContractAddress> = [
    {name: "Polyhedra", addresses: ["0xCE0e4e4D2Dc0033cE2dbc35855251F4F3D086D0A".toLowerCase()]},
    {
        name: "Orbiter",
        addresses: [
            "0x13E46b2a3f8512eD4682a8Fb8B560589fE3C2172".toLowerCase(),
            "0x80C67432656d59144cEFf962E8fAF8926599bCF8".toLowerCase(),
            "0xE4eDb277e41dc89aB076a1F049f4a3EfA700bCE8".toLowerCase(),
        ],
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

// for tracking tx, other bridges use event logs
const bridgeAddresses: Array<ContractAddress> = [
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
        name: "miniBridge",
        addresses: [
            "0x00000000000007736e2F9aA5630B8c812E1F3fc9".toLowerCase()
        ]
    }
];

const socialAddresses: Array<ContractAddress> = [
    {
        name: "POMP",
        addresses: [
            '0xa44155ffbcE68C9C848f8Ea6F28C40311085125E'.toLowerCase()
        ]
    },
    {
        name: "Moonfit",
        addresses: [
            '0x8D8F5B2c76a8a7e1Bc882a46a71133458132E8AC'.toLowerCase()
        ]
    },
    {
        name: "Metale",
        addresses: [
            '0xe9eB224a6349775ab41567D996A748a032DB57f3'.toLowerCase()
        ]
    },
    {
        name: "Dmail",
        addresses: [
            '0xC0b920c31c1D9047D043b201e6b3956eDb1A0374'.toLowerCase()
        ]
    },
    {
        name: "Omnisea",
        addresses: [
            '0x46Ce46951D12710d85bc4FE10BB29c6Ea5012077'.toLowerCase()
        ]
    }
]

const swapAddresses: Array<ContractAddress> = [
    {
        name: "Aperture",
        addresses: [
            "0x3488d5A2D0281f546e43435715C436b46Ec1C678".toLowerCase()
        ]
    },
    {
        name: "iZUMI",
        addresses: [
            "0x3EF68D3f7664b2805D4E88381b64868a56f88bC4".toLowerCase()
        ]
    },
    {
        name: "PacificSwap",
        addresses: [
            "0x632c8519D9CDd3b36CF7cf391CD9C437564bAE6a".toLowerCase()
        ]
    },
    {
        name: "OpenOcean",
        addresses: [
            "0x6352a56caadC4F1E25CD6c75970Fa768A3304e64".toLowerCase()
        ]
    }
    {
        name: "Rivera Money",
        addresses: [
            "0x0DB2BA00bCcf4F5e20b950bF954CAdF768D158Aa".toLowerCase()
        ]
    }
]

const txContracts = bridgeAddresses.concat(socialAddresses, swapAddresses);
const eventContracts = bridgeEventAddressses;
const allContracts = txContracts.concat(eventContracts);

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

// contracts being tracked using txs
const recordTxAddresses = addressHashMap(txContracts);

const recordEventAddresses = addressHashMap(eventContracts);

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

        for (let log of c.logs) {
            if (log) {
                const contractName = recordEventAddresses[log.address];
                const contractEvent = contractDailyInteraction[contractName];
                if (contractEvent) {
                    contractEvent.txNum++;
                    if (log.transaction) {
                        contractEvent.dailyGas += log.transaction.gas;
                    }
                    contractDailyInteraction[contractName] = contractEvent;
                }
            }
        }

        for (let tx of c.transactions) {
            // increment daily tx
            dailyTx.txNum++;
            // increment hourly tx
            hourlyTx.txNum++;
            walletSet.add(tx.from);
            if (tx.to) {
                const contractName = recordTxAddresses[tx.to];
                let contractTx = contractDailyInteraction[contractName];
                if (contractTx) {
                    contractTx.txNum++;
                    contractTx.dailyGas += tx.gas;
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
                    contractInteraction.cumulativeGas += contractInteraction.dailyGas;
                    ctx.log.info(`name: ${contractInteraction.name}, txNum: ${contractInteraction.txNum}`);
                    await ctx.store.upsert(contractInteraction);
                    contractInteraction.txNum = 0;
                    contractInteraction.dailyGas = 0n;
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

    for (const contract of allContracts) {
        let initContract = await ctx.store.get(ContractDailyInteraction, {where: {id: contract.name + "0"}});
        if (initContract === undefined) {
            initContract = new ContractDailyInteraction({
                id: contract.name + "0",
                name: contract.name,
                date: new Date(),
                txNum: 0,
                dailyGas: 0n,
                cumulativeTx: 0,
                cumulativeGas: 0n,
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
