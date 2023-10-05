module.exports = class Data1696533612946 {
    name = 'Data1696533612946'

    async up(db) {
        await db.query(`CREATE TABLE "daily_tx" ("id" character varying NOT NULL, "tx_num" integer NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_2ec9481d3e8d02dedb302ca0d05" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_b69d109a49873c55ab0ad5fddd" ON "daily_tx" ("date") `)
        await db.query(`CREATE TABLE "daily_active_wallet" ("id" character varying NOT NULL, "active_wallet" integer NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_f127315a0fc772bbc0c00b90a5f" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_9797df43738726f1af0e1a79e4" ON "daily_active_wallet" ("date") `)
    }

    async down(db) {
        await db.query(`DROP TABLE "daily_tx"`)
        await db.query(`DROP INDEX "public"."IDX_b69d109a49873c55ab0ad5fddd"`)
        await db.query(`DROP TABLE "daily_active_wallet"`)
        await db.query(`DROP INDEX "public"."IDX_9797df43738726f1af0e1a79e4"`)
    }
}
