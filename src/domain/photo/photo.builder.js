export const buildPhotoUploadPayload = (idPerson, codeCatFiles, file) => ({
    code_cat_files: codeCatFiles,
    id_person: idPerson,
    file
});

export const buildPhotoDeletePayload = (idPerson, codeCatFiles, key) => ({
    code_cat_files: codeCatFiles,
    id_person: idPerson,
    key
});

export const buildProfilePhotoPayload = (idPerson, file) => ({
    id_person: idPerson,
    file
});
