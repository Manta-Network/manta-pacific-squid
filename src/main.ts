import {TypeormDatabase} from '@subsquid/typeorm-store'
import {DailyTx, HourlyTx, DailyActiveWallet,  CumulativeWallets} from './model'
import {processor} from './processor'

let currDay: Date | undefined = undefined;
let endHour: Date | undefined = undefined;
let endDay: Date | undefined = undefined;
let dailyTx = new DailyTx({
    id: "0",
    txNum: 0,
    date: new Date(),
});
let hourlyTx = new HourlyTx({
    id: "0",
    txNum: 0,
    date: new Date(),
})
let dailyActive = new DailyActiveWallet({
    id: "0",
    activeWallet: 0,
    date: new Date(),
    cumulativeUsers: 0,
})
let walletSet: Set<string> = new Set();

processor.run(new TypeormDatabase({supportHotBlocks: true}), async (ctx) => {
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

        for (let tx of c.transactions) {
            // increment daily tx
            dailyTx.txNum++;
            // increment hourly tx
            hourlyTx.txNum++;
            walletSet.add(tx.from);
        }

        if (currDay > endHour) {
            ctx.log.info(`new hour started! previous hour tx volume ${hourlyTx.txNum}`);
            hourlyTx.id = c.header.id;
            await ctx.store.upsert(hourlyTx);
            endHour.setTime(endHour.getTime() + (1000 * 60 * 60));

            // reset daily tx number to zero
            hourlyTx.txNum = 0;
            await ctx.store.upsert([...walletSet.values()].map((x)=> {
                return new CumulativeWallets({id: x})
            }));
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

            await ctx.store.upsert(dailyActive)
            await ctx.store.upsert(dailyTx);
            endDay.setTime(currDay.getTime() + (1000 * 60 * 60 * 24));

            // reset daily tx number to zero
            dailyTx.txNum = 0;
            // reset daily users
            walletSet.clear();
        } else {
            dailyTx.id = "0";
            dailyActive.id = "0";
            dailyActive.activeWallet = walletSet.size;
            dailyActive.cumulativeUsers = await ctx.store.count(CumulativeWallets);

            await ctx.store.upsert(dailyActive);
            await ctx.store.upsert(dailyTx);
        }
    }
})
