module.exports = class Data1696967077063 {
    name = 'Data1696967077063'

    async up(db) {
        await db.query(`CREATE TABLE "daily_tx" ("id" character varying NOT NULL, "tx_num" integer NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_2ec9481d3e8d02dedb302ca0d05" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_b69d109a49873c55ab0ad5fddd" ON "daily_tx" ("date") `)
        await db.query(`CREATE TABLE "hourly_tx" ("id" character varying NOT NULL, "tx_num" integer NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_7103d4b0b27db00069d07c32051" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_f3cb22d555247dd8f16a51bff7" ON "hourly_tx" ("date") `)
        await db.query(`CREATE TABLE "daily_active_wallet" ("id" character varying NOT NULL, "active_wallet" integer NOT NULL, "date" TIMESTAMP WITH TIME ZONE NOT NULL, "cumulative_users" integer NOT NULL, CONSTRAINT "PK_f127315a0fc772bbc0c00b90a5f" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_9797df43738726f1af0e1a79e4" ON "daily_active_wallet" ("date") `)
        await db.query(`CREATE TABLE "cumulative_wallets" ("id" character varying NOT NULL, CONSTRAINT "PK_da3327a0675c1bf7b37eabea9e0" PRIMARY KEY ("id"))`)
    }

    async down(db) {
        await db.query(`DROP TABLE "daily_tx"`)
        await db.query(`DROP INDEX "public"."IDX_b69d109a49873c55ab0ad5fddd"`)
        await db.query(`DROP TABLE "hourly_tx"`)
        await db.query(`DROP INDEX "public"."IDX_f3cb22d555247dd8f16a51bff7"`)
        await db.query(`DROP TABLE "daily_active_wallet"`)
        await db.query(`DROP INDEX "public"."IDX_9797df43738726f1af0e1a79e4"`)
        await db.query(`DROP TABLE "cumulative_wallets"`)
    }
}
