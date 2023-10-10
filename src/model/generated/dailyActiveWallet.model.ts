import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_} from "typeorm"

@Entity_()
export class DailyActiveWallet {
    constructor(props?: Partial<DailyActiveWallet>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Column_("int4", {nullable: false})
    activeWallet!: number

    @Index_()
    @Column_("timestamp with time zone", {nullable: false})
    date!: Date

    @Column_("int4", {nullable: false})
    cumulativeUsers!: number
}
