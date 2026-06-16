import moment from "moment";

export function getAge(dateString) {
    var today = new Date();
    try {
        var birthDate = new Date( moment(dateString, 'DD-MM-yyyy'));
        if(birthDate instanceof Date && !isNaN(birthDate) ) {
            var age = today.getFullYear() - birthDate.getFullYear();
            var m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
           
            return  isNaN(age) || age == undefined ? 0 : age;
        }
        return 0
    } catch (error) {
        console.error(error)
    }

}


export function formatFecha (date) {
    if (!date) return null
       const [year, month, day] = date.split('-')
       return `${day}-${month}-${year}`
}

export function revertFormatFecha (date) {
    if (!date) return null
       const [day, month, year] = date.split('-')
       return `${year}-${month}-${day}`
}