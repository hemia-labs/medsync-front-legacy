export default class DAMonitorPlanModel {
    constructor(
            quote_date_now,
            id_cat_treatment_now,
            quote_date_after,
            id_cat_treatment_after,
            note
    ) {
        this.quote_date_now = quote_date_now ? quote_date_now : '',
        this.id_cat_treatment_now = id_cat_treatment_now ? id_cat_treatment_now : '',
        this.quote_date_after = quote_date_after ? quote_date_after : '',
        this.id_cat_treatment_after = id_cat_treatment_after ? id_cat_treatment_after : '',
        this.note = note ? note : ''
    }
}