import DAPersonModel from '../person/DAPerson.model';
import DAAddressModel from '../address/DAAddress.model'; 
import DADiagnosticModel from '../patient/DADiagnostic.model'; 
import DAFamilyBrothersModel from '../patient/DAFamilyBrothers.model'; 
import DASignatureModel from '../patient/DASignature.model'; 
import DAAlergyModel from './DAAllergy.model';
import DAFamilyGrandparentsModel from './DAFamilyGrandparents.model';

export default class DAPatientModel {
    constructor(
        person,
        address,
        query,
        family_parents,
        family_brothers,
        family_grandparents,
        files,
        pathological_data,
        allergy
    ) {
        this.person = person ? person : new DAPersonModel(),
        this.address = address ? address : new DAAddressModel(),
        this.query = query ? query : new DADiagnosticModel(),
        this.family_parents = family_parents ? family_parents : new Array(DAFamilyGrandparentsModel),
        this.family_brothers = family_brothers ? family_brothers : new DAFamilyBrothersModel(),
        this.family_grandparents = family_grandparents ? family_grandparents : [],
        this.files = files ? files : new DASignatureModel()
        this.pathological_data = pathological_data ? pathological_data : {}
        this.allergy = allergy ? allergy : new DAAlergyModel()
    }
}