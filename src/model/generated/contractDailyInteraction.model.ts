import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_} from "typeorm"
import * as marshal from "./marshal"

@Entity_()
export class ContractDailyInteraction {
    constructor(props?: Partial<ContractDailyInteraction>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @Column_("timestamp with time zone", {nullable: false})
    date!: Date

    @Column_("text", {nullable: false})
    name!: string

    @Column_("int4", {nullable: false})
    txNum!: number

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
    dailyGas!: bigint

    @Column_("int4", {nullable: false})
    cumulativeTx!: number

    @Column_("numeric", {transformer: marshal.bigintTransformer, nullable: false})
    cumulativeGas!: bigint
}
