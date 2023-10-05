import {TypeormDatabase} from '@subsquid/typeorm-store'
import {DailyTx} from './model'
import {processor} from './processor'

processor.run(new TypeormDatabase({supportHotBlocks: true}), async (ctx) => {
    let currDay: Date | undefined = undefined;
    let endDay: Date | undefined = undefined;
    let dailyTx = new DailyTx({
        id: "0",
        txNum: 0,
        date: new Date(),
    });

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
        ctx.log.info(`squid curr: ${currDay} end ${endDay}`);
        currDay.setDate(blockDate.getDate());
        dailyTx.date.setDate(endDay.getDate());

        for (let tx of c.transactions) {
            dailyTx.txNum += 1;
        }

        if (currDay > endDay) {
            ctx.log.info(`new day started! previous day tx volume ${dailyTx.txNum}`);
            dailyTx.id = c.header.id;
            await ctx.store.upsert(dailyTx);
            endDay.setDate(currDay.getDate() + 1);

            // reset daily tx number to zero
            dailyTx.txNum = 0;
        } else {
            dailyTx.id = "0";
            await ctx.store.upsert(dailyTx);
        }
    }
})
