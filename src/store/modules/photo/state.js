import DAHasErrorModel from '../../../models/error/DAHasErrorModel';

const state = () => ({

    hasErrorPhoto:      new DAHasErrorModel(),
    isGetTypePhoto:     [],
    isSavePhoto:        {},
    isGetPhoto:         [],
    isDeletePhoto:      [],
})

export default state