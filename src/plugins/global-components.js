import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import LottieAnimation from 'lottie-vuejs/src/LottieAnimation.vue';

import AdminLayout from '@/core/layouts/admin.vue';
import DefaultLayout from '@/core/layouts/default.vue';
import DAActionsButton from '@/core/components/form/buttons/DAActionsButton.vue';
import DACancelButton from '@/core/components/form/buttons/DACancelButton.vue';
import DADatatable from '@/core/components/form/table/DADatatable.vue';
import DADatePicker from '@/core/components/form/menu/DADatePicker.vue';
import DADatePickerField from '@/core/components/form/menu/DADatePickerField.vue';
import DADialog from '@/core/components/form/dialog/DADialog.vue';
import DADialogConfirm from '@/core/components/form/dialog/components/DADialogconfirm.vue';
import DAGrayButton from '@/core/components/form/buttons/DAGrayButton.vue';
import DAHeaderTitle from '@/core/components/form/header/DAHeaderTitle.vue';
import DALoader from '@/core/components/form/loader/loader.vue';
import DAPrimary900Button from '@/core/components/form/buttons/DAPrimary900Button.vue';
import DAPrimaryButton from '@/core/components/form/buttons/DAPrimaryButton.vue';
import DASecondaryButton from '@/core/components/form/buttons/DASecondaryButton.vue';
import DAScopedColumn from '@/core/components/form/table/DAScopedColumn.vue';
import DASignaturePad from '@/core/components/global/signature/DASignaturePad.vue';
import DATextAreaPrimary from '@/core/components/form/input/DATextAreaPrimary.vue';
import DATextFieldPrimary from '@/core/components/form/input/DATextFieldPrimary.vue';
import DACropper from '@/core/components/global/files/DACropper.vue';

const components = {
  'f-icon': FontAwesomeIcon,
  'lottie-animation': LottieAnimation,
  'da-button-primary': DAPrimaryButton,
  'da-button-secondary': DASecondaryButton,
  'da-button-gray': DAGrayButton,
  'da-datatable': DADatatable,
  'da-text-field-primary': DATextFieldPrimary,
  'da-text-area-primary': DATextAreaPrimary,
  'da-header-title': DAHeaderTitle,
  'da-button-actions': DAActionsButton,
  'da-button-900': DAPrimary900Button,
  'da-dialog': DADialog,
  'da-dialog-confirm': DADialogConfirm,
  'da-date-picker': DADatePicker,
  'da-date-picker-field': DADatePickerField,
  'da-signature-pad': DASignaturePad,
  'da-cropper': DACropper,
  'da-loader': DALoader,
  'da-scoped-column': DAScopedColumn,
  'da-button-cancel': DACancelButton,
  'default-layout': DefaultLayout,
  'admin-layout': AdminLayout,
};

export default function registerGlobalComponents(Vue) {
  Object.entries(components).forEach(([name, component]) => {
    Vue.component(name, component);
  });
}
