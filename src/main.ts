import {TypeormDatabase} from '@subsquid/typeorm-store'
import {DailyTx} from './model'
import {processor} from './processor'

processor.run(new TypeormDatabase({supportHotBlocks: true}), async (ctx) => {
    const currDay = new Date();
    const endDay = new Date();
    let dailyTx: DailyTx = {
        id: "0",
        txNum: 0,
        date: new Date(),
    };

    for (let c of ctx.blocks) {
        const blockDate = new Date(c.header.timestamp);
        currDay.setDate(blockDate.getDate());
        // init value first loop
        if (blockDate < currDay) {
            dailyTx.date.setDate(currDay.getDate());
            endDay.setDate(blockDate.getDate() + 1);
        }

        for (let tx of c.transactions) {
            dailyTx.txNum += 1;
        }

        ctx.log.info("here");

        if (currDay >= endDay) {
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
