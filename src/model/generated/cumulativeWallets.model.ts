import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_} from "typeorm"

@Entity_()
export class CumulativeWallets {
    constructor(props?: Partial<CumulativeWallets>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string
}
