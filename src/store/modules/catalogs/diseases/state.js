const state = () => ({
    diseases: [
        {id: '12132132132', description: 'Fiebre Reumatica', unique: true},
        {id: '65465498654', description: 'Enfermedades Cadiovasculares', unique: true},
        {id: '34654546546', description: 'Mareos, desmayos o ataques', unique: true},
        {id: 'PA5PSLE8R8T', description: 'Diabetes', unique: true},
        {id: 'NH7MP4KSK2M', description: 'Hepatitis', unique: true},
        {id: 'F3BXNG8ELNV', description: 'V.I.H.', unique: true},
        {id: 'CVYKVC8PRZP', description: 'Artritis', unique: true},
        {id: 'TSAHTUSALUL', description: 'Gastritis o Ulceras', unique: true},
        {id: 'P65SR63B5AJ', description: 'Problemas renales', unique: true},
        {id: 'FKJCRTBEPGF', description: 'Anemia', unique: true},
        {id: 'BTNJXB48W6X', description: 'Presion arterial alta', unique: true},
        {id: 'WJ3BLYL92VJ', description: 'Presion Arterial baja', unique: true},
        {id: 'RVWEVJVS6WM', description: 'Sangrado anormal o cortaduras', unique: true},
        {id: 'FDVNGQLU272', description: 'Se le hacen moretones con facilidad', unique: false, options: [{id: '312321', description: 'Si'}, {id: '54654', description: 'No'}]},
        {id: '9CU9CPDNU7T', description: 'Ha requerido trasfuciones sanguineas', unique: false, options: [{id: '1321321', description: 'Si'}, {id: '87987', description: 'No'}]},
        {id: 'DVD9V4VTLJP', description: 'Alergico', unique: false, options: [{id: '1321321', description: 'Si'}, {id: '87987', description: 'No'}], plain: true},
    ],
})

export default state