export default class DADiagnosticModel {
    constructor(
        reason_consultation,
		current_condition,
		pulse,
		blood_pressure,
		dia,
		oxygenation
    ) {
		this.reason_consultation = reason_consultation ? reason_consultation : '',
		this.current_condition = current_condition ? current_condition : '',
		this.pulse = pulse ? pulse : '',
		this.blood_pressure = blood_pressure ? blood_pressure : '',
		this.dia = dia ? dia: '',
		this.oxygenation = oxygenation ? oxygenation : ''
    }
}
