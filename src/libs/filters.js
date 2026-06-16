import Vue from 'vue';
import moment from 'moment';

Vue.filter('formatDate', (value) => {
    if(!value) return ''
    return moment.utc(new Date(value)).format('DD/MM/yyyy');
});

Vue.filter('toDateMonthName', (value) => {
    if(!value) return ''
    let date = moment.utc(new Date(value))
    date.locale('es')
    return date.format('DD [de] MMMM yyyy')
});


Vue.filter('currency', (value) => {
    
    if(!value) return '$0.0'
    const options = { style: 'currency', currency: 'USD' };
    const Format = new Intl.NumberFormat('en-US', options);
    return Format.format(value);
});

Vue.filter('phone', function (phone) {
    if(!phone) return ''
    return phone.replace(/[^0-9]/g, '')
                .replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
});

Vue.filter('truncate', function (value, size) {
    if (!value) return '';
    value = value.toString();
  
    if (value.length <= size) {
      return value;
    }
    return value.substr(0, size) + '...';
  });

  Vue.filter('uppercase', (value) => {
    if(!value) return ''
    return value.toUpperCase()
});
