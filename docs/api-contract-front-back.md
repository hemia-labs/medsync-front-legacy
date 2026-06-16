# Contrato API front-back observado

Este documento describe el contrato usado actualmente por el front legacy contra el back legacy. No introduce cambios de API; sirve como referencia para refactors y validaciones futuras.

## Respuesta comun

El backend responde normalmente con:

```json
{
  "status": 200,
  "data": {},
  "message": "..."
}
```

El cliente `DACore` transforma respuestas HTTP `200` en:

```json
{
  "status": 200,
  "data": {},
  "message": "...",
  "success": true
}
```

Errores de API, red o timeout se normalizan como:

```json
{
  "success": false,
  "message": "No fue posible completar la solicitud."
}
```

## Pacientes

| Accion | Metodo | Endpoint | Payload front | Backend |
| --- | --- | --- | --- | --- |
| Crear paciente | POST | `api/px/save` | `DAPatientModel` | `PxController.PxSave` |
| Actualizar paciente | PUT | `api/px/update` | `DAPatientModel` con `person.id_person` | `PxController.PxUpdate` |
| Obtener paciente | GET | `api/px/get/:id` | Parametro URL `id` | `PxController.getPxById` |
| Eliminar paciente | DELETE | `api/px/delete` | `{ "id_person": number|string }` | `PxController.pxDelete` |
| Buscar pacientes | POST | `api/px/search` | `{ "param": string }` | `PxController.getPxSearch` |

Payload principal `DAPatientModel`:

```json
{
  "person": {
    "id_person": "solo update",
    "name": "string",
    "surname": "string",
    "birthday": "YYYY-MM-DD",
    "age": "number|string",
    "ocupation": "string",
    "rfc": "string",
    "local_telephone": "string",
    "telephone": "string",
    "id_signature": "string|null",
    "name_signature": "string"
  },
  "address": {
    "place_birth": "string",
    "residence": "string",
    "direction": "string",
    "cp": "string"
  },
  "query": {
    "reason_consultation": "string",
    "current_condition": "string",
    "pulse": "string",
    "blood_pressure": "string",
    "oxygenation": "string",
    "dia": "YYYY-MM-DD"
  },
  "files": {
    "file": "data:image/...;base64,..."
  },
  "pathological_data": [],
  "allergy": {
    "has_allergy": true,
    "description": "string"
  },
  "social_media": {
    "inputSelected": ["Facebook"],
    "isCheck": false,
    "text": null
  }
}
```

## Fotos y archivos

| Accion | Metodo | Endpoint | Payload front | Backend |
| --- | --- | --- | --- | --- |
| Catalogo tipos foto | GET | `api/catalog/Files` | Sin payload | `CatalogController.getCatalogFiles` |
| Subir foto/radiografia | POST | `api/file/px/upload-file` | Ver abajo | `FilesController.uploadFile` |
| Listar fotos | GET | `api/file/px/file/:px` | Parametro URL `px` | `FilesController.getfilesPhoto` |
| Eliminar foto | DELETE | `api/file/delete` | Ver abajo | `FilesController.deletefile` |
| Subir perfil | POST | `api/file/px/upload-profile` | `{ "id_person": "...", "file": "data:image/...;base64,..." }` | `FilesController.uploaProfilePhoto` |

Subir foto:

```json
{
  "code_cat_files": "C4CA42",
  "id_person": "number|string",
  "file": "data:image/png;base64,..."
}
```

Codigos de bucket observados:

| Codigo | Bucket logico |
| --- | --- |
| `CFCD20` | Firmas |
| `C4CA42` | Fotos |
| `C81E72` | Rayos X |

Eliminar foto:

```json
{
  "code_cat_files": "C4CA42",
  "id_person": "number|string",
  "key": "https://bucket.s3.region.amazonaws.com/file.png"
}
```

Nota: el backend acepta `key` como URL completa o como key directa de S3.

## Odontograma

| Accion | Metodo | Endpoint | Payload front | Backend |
| --- | --- | --- | --- | --- |
| Tipos de odontograma | GET | `api/odontogram/getcatypetooth` | Sin payload | `OdontogramController.GetCatTypeTooth` |
| Validar activo | GET | `api/odontogram/v1/validate/:id_person` | Parametro URL | `OdontogramController.getValidator` |
| Crear odontograma | POST | `api/odontogram/v1/save` | `DAOdontogramParentModel` | `OdontogramController.saveOdontogramv1` |
| Obtener detalle | GET | `api/odontogram/v1/odontogram/:id_person` | Parametro URL | `OdontogramController.getOdontogram` |
| Guardar diagnostico dental | POST | `api/odontogram/v1/detail` | `DAOdontogramDetailModel` | `OdontogramController.saveOdontogramvDetailV1` |
| Historial | GET | `api/odontogram/v1/history/:id_person` | Parametro URL | `OdontogramController.getHistoryv1` |
| Cambiar estado | PUT | `api/odontogram/v1/status` | `DAOdontogramStatusModel` | `OdontogramController.updateStatusOdontogramV1` |
| Eliminar odontograma | DELETE | `api/odontogram/v1/delete` | `DAOdontogramDeleteModel` | `OdontogramController.deleteOdontogramV1` |

Crear odontograma:

```json
{
  "id_person": "number|string",
  "type": "codigo_tipo",
  "expand": "INDICARTOR_DISABLED"
}
```

Guardar diagnostico dental:

```json
{
  "id_odontogram_detailv1": "opcional para update",
  "id_tooth": "number|string",
  "treatment": "string",
  "id_person": "number|string"
}
```

Cambiar estado:

```json
{
  "id_odontogramv1": "number|string",
  "active": false
}
```

Eliminar:

```json
{
  "id_odontogramv1": "number|string"
}
```

## Tratamientos

| Accion | Metodo | Endpoint | Payload front | Backend |
| --- | --- | --- | --- | --- |
| Listar otros tratamientos | GET | `api/treatment/list/:id_person` | Parametro URL | `TreatmentController.GetTreatment` |
| Crear otros tratamientos | POST | `api/treatment/save` | Ver abajo | `TreatmentController.SaveTreatment` |
| Actualizar otros tratamientos | PUT | `api/treatment/update` | Ver abajo | `TreatmentController.UpdateTreatment` |
| Eliminar otro tratamiento | DELETE | `api/treatment/delete` | `{ "id_treatment": "...", "id_person": "..." }` | `TreatmentController.DeleteTreatment` |
| Obtener diagnosticos | GET | `api/treatment/diagnosis/get/:id_person` | Parametro URL | `TreatmentController.GetDiagnosis` |
| Guardar diagnostico | POST | `api/treatment/diagnosis/save` | Ver abajo | `TreatmentController.SaveDiagnosis` |

Crear otros tratamientos:

```json
{
  "id_person": "number|string",
  "treatment": [
    {
      "description": "string",
      "amount": "number|string"
    }
  ]
}
```

Actualizar otros tratamientos:

```json
{
  "id_person": "number|string",
  "treatment": [
    {
      "id_treatment": "number|string",
      "description": "string",
      "amount": "number|string"
    }
  ]
}
```

Guardar diagnostico:

```json
{
  "id_diagnosis": "number|string",
  "id_odontogram": "number|string",
  "id_person": "number|string",
  "treatment": "string",
  "amount": "number|string"
}
```

## Notas de refactor seguro

- Las rutas se pueden declarar como `api/...` o `/api/...`; `DACore` remueve slashes iniciales antes de enviar a Axios.
- Para errores de red sin `error.response`, los servicios deben confiar en `DACore` y no acceder directamente a `error.response.data`.
- Los payloads aun no tienen validacion formal de esquema; esta tabla es la base para agregar validadores front/back mas adelante.
