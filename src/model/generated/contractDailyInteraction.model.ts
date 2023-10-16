import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_} from "typeorm"

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

    @Column_("int4", {nullable: false})
    dailyGas!: number

    @Column_("int4", {nullable: false})
    cumulativeTx!: number

    @Column_("int4", {nullable: false})
    cumulativeGas!: number
}
