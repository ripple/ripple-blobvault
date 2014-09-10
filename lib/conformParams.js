var conformParams = function(data) {
  var params = {
  identification : { },
  name           : { },
  address        : { },
  };
    
  //attributes from the stored identity profile
  if (data.attributes) {
    data.attributes.forEach(function(attr) {
      switch (attr.name) {
        case 'given_name' :
            params.name.first = attr.value
        break;
        case 'family_name' :
            params.name.last = attr.value;
        break;
        case 'birthdate' :
            params.date_of_birth = attr.value
        break; 
        case 'ssn_last_4' :
            params.identification.ssn = attr.value      
        break;  
        case 'passport' :
            params.identification.passport = attr.value
        break;
        case 'phone' :
            params.phone_number = attr.value
        break;
        case 'ip' : 
            params.ip_address = attr.value 
        break;
        case 'middle_name' :
            params.name.middle = attr.value
        break;
        default :
        break;
      }
    });
    
    data.addresses.forEach(function(attr) {
      if (attr.type == 'default') {
        params.address.street1 = attr.line1; 
        params.address.street2 = attr.line2;  
        params.address.city = attr.locality; 
        params.address.state = attr.region; 
        params.address.postal_code = attr.postal_code; 
        params.address.country_code = attr.country;  
      }
    })
    
    //parameters passed in
    } else {
      params.name.first    = data.name.given;
      params.name.last     = data.name.family;
      params.name.middle   = data.name.middle;
      params.date_of_birth = data.birthdate;
      params.phone_number  = data.phone;
      params.ip_address    = data.ip 
      
      params.identification.ssn      = data.ssn || data.ssn_last_4;
      params.identification.passport = data.passport;

      params.address.street1      = data.address.line1; 
      params.address.street2      = data.address.line2;  
      params.address.city         = data.address.locality; 
      params.address.state        = data.address.region; 
      params.address.postal_code  = data.address.postal_code; 
      params.address.country_code = data.address.country;   
    }
    
    return {params:params}
};

module.exports = exports = conformParams
