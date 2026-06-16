
import { options } from './axios.handlestatus'

export const handleSuccess = response => (response)

export const handleError = (error) => {

    const status = error.response ? error.response.status : 'default';
    return options[status] ? options[status](error) : options['default'](error)
}
