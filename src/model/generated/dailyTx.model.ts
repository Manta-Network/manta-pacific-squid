import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, Index as Index_} from "typeorm"

@Entity_()
export class DailyTx {
    constructor(props?: Partial<DailyTx>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Column_("int4", {nullable: false})
    txNum!: number

    @Index_()
    @Column_("timestamp with time zone", {nullable: false})
    date!: Date
}
