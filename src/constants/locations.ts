// ============================================================
// File: src/constants/locations.ts
// Purpose: Indian Cities, States, and PIN Code directory with
//          real-time bidirectional auto-filling and validation.
// ============================================================

export interface CityLocation {
  city: string;
  state: string;
  pincode: string;
  phonePrefix: string;
}

export const INDIAN_STATES: string[] = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export const CITIES_DIRECTORY: CityLocation[] = [
  // --- Tamil Nadu ---
  { city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', phonePrefix: '+91 44' },
  { city: 'Coimbatore', state: 'Tamil Nadu', pincode: '641001', phonePrefix: '+91 422' },
  { city: 'Madurai', state: 'Tamil Nadu', pincode: '625001', phonePrefix: '+91 452' },
  { city: 'Tiruchirappalli', state: 'Tamil Nadu', pincode: '620001', phonePrefix: '+91 431' },
  { city: 'Salem', state: 'Tamil Nadu', pincode: '636001', phonePrefix: '+91 427' },
  { city: 'Tirunelveli', state: 'Tamil Nadu', pincode: '627001', phonePrefix: '+91 462' },
  { city: 'Tiruppur', state: 'Tamil Nadu', pincode: '641601', phonePrefix: '+91 421' },
  { city: 'Vellore', state: 'Tamil Nadu', pincode: '632001', phonePrefix: '+91 416' },
  { city: 'Erode', state: 'Tamil Nadu', pincode: '638001', phonePrefix: '+91 424' },
  { city: 'Thanjavur', state: 'Tamil Nadu', pincode: '613001', phonePrefix: '+91 4362' },
  { city: 'Dindigul', state: 'Tamil Nadu', pincode: '624001', phonePrefix: '+91 451' },
  { city: 'Kanchipuram', state: 'Tamil Nadu', pincode: '631501', phonePrefix: '+91 44' },
  { city: 'Cuddalore', state: 'Tamil Nadu', pincode: '607001', phonePrefix: '+91 4142' },
  { city: 'Nagercoil', state: 'Tamil Nadu', pincode: '629001', phonePrefix: '+91 4652' },
  { city: 'Hosur', state: 'Tamil Nadu', pincode: '635109', phonePrefix: '+91 4344' },

  // --- Karnataka ---
  { city: 'Bengaluru', state: 'Karnataka', pincode: '560001', phonePrefix: '+91 80' },
  { city: 'Mysuru', state: 'Karnataka', pincode: '570001', phonePrefix: '+91 821' },
  { city: 'Mangaluru', state: 'Karnataka', pincode: '575001', phonePrefix: '+91 824' },
  { city: 'Hubballi-Dharwad', state: 'Karnataka', pincode: '580020', phonePrefix: '+91 836' },
  { city: 'Belagavi', state: 'Karnataka', pincode: '590001', phonePrefix: '+91 831' },
  { city: 'Kalaburagi', state: 'Karnataka', pincode: '585101', phonePrefix: '+91 8472' },
  { city: 'Ballari', state: 'Karnataka', pincode: '583101', phonePrefix: '+91 8392' },
  { city: 'Shivamogga', state: 'Karnataka', pincode: '577201', phonePrefix: '+91 8182' },

  // --- Maharashtra ---
  { city: 'Mumbai', state: 'Maharashtra', pincode: '400001', phonePrefix: '+91 22' },
  { city: 'Pune', state: 'Maharashtra', pincode: '411001', phonePrefix: '+91 20' },
  { city: 'Nagpur', state: 'Maharashtra', pincode: '440001', phonePrefix: '+91 712' },
  { city: 'Thane', state: 'Maharashtra', pincode: '400601', phonePrefix: '+91 22' },
  { city: 'Nashik', state: 'Maharashtra', pincode: '422001', phonePrefix: '+91 253' },
  { city: 'Chhatrapati Sambhaji Nagar (Aurangabad)', state: 'Maharashtra', pincode: '431001', phonePrefix: '+91 240' },
  { city: 'Solapur', state: 'Maharashtra', pincode: '413001', phonePrefix: '+91 217' },
  { city: 'Kolhapur', state: 'Maharashtra', pincode: '416001', phonePrefix: '+91 231' },
  { city: 'Navi Mumbai', state: 'Maharashtra', pincode: '400703', phonePrefix: '+91 22' },

  // --- Delhi NCR ---
  { city: 'Delhi', state: 'Delhi', pincode: '110001', phonePrefix: '+91 11' },
  { city: 'New Delhi', state: 'Delhi', pincode: '110001', phonePrefix: '+91 11' },
  { city: 'Noida', state: 'Uttar Pradesh', pincode: '201301', phonePrefix: '+91 120' },
  { city: 'Greater Noida', state: 'Uttar Pradesh', pincode: '201308', phonePrefix: '+91 120' },
  { city: 'Ghaziabad', state: 'Uttar Pradesh', pincode: '201001', phonePrefix: '+91 120' },
  { city: 'Gurugram', state: 'Haryana', pincode: '122001', phonePrefix: '+91 124' },
  { city: 'Faridabad', state: 'Haryana', pincode: '121001', phonePrefix: '+91 129' },

  // --- Telangana ---
  { city: 'Hyderabad', state: 'Telangana', pincode: '500001', phonePrefix: '+91 40' },
  { city: 'Warangal', state: 'Telangana', pincode: '506001', phonePrefix: '+91 870' },
  { city: 'Nizamabad', state: 'Telangana', pincode: '503001', phonePrefix: '+91 8462' },
  { city: 'Karimnagar', state: 'Telangana', pincode: '505001', phonePrefix: '+91 878' },
  { city: 'Khammam', state: 'Telangana', pincode: '507001', phonePrefix: '+91 8742' },

  // --- Andhra Pradesh ---
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', pincode: '530001', phonePrefix: '+91 891' },
  { city: 'Vijayawada', state: 'Andhra Pradesh', pincode: '520001', phonePrefix: '+91 866' },
  { city: 'Guntur', state: 'Andhra Pradesh', pincode: '522001', phonePrefix: '+91 863' },
  { city: 'Nellore', state: 'Andhra Pradesh', pincode: '524001', phonePrefix: '+91 861' },
  { city: 'Kurnool', state: 'Andhra Pradesh', pincode: '518001', phonePrefix: '+91 8518' },
  { city: 'Tirupati', state: 'Andhra Pradesh', pincode: '517501', phonePrefix: '+91 877' },

  // --- Kerala ---
  { city: 'Kochi', state: 'Kerala', pincode: '682001', phonePrefix: '+91 484' },
  { city: 'Thiruvananthapuram', state: 'Kerala', pincode: '695001', phonePrefix: '+91 471' },
  { city: 'Kozhikode', state: 'Kerala', pincode: '673001', phonePrefix: '+91 495' },
  { city: 'Thrissur', state: 'Kerala', pincode: '680001', phonePrefix: '+91 487' },
  { city: 'Kollam', state: 'Kerala', pincode: '691001', phonePrefix: '+91 474' },
  { city: 'Kannur', state: 'Kerala', pincode: '670001', phonePrefix: '+91 497' },

  // --- Gujarat ---
  { city: 'Ahmedabad', state: 'Gujarat', pincode: '380001', phonePrefix: '+91 79' },
  { city: 'Surat', state: 'Gujarat', pincode: '395001', phonePrefix: '+91 261' },
  { city: 'Vadodara', state: 'Gujarat', pincode: '390001', phonePrefix: '+91 265' },
  { city: 'Rajkot', state: 'Gujarat', pincode: '360001', phonePrefix: '+91 281' },
  { city: 'Bhavnagar', state: 'Gujarat', pincode: '364001', phonePrefix: '+91 278' },
  { city: 'Gandhinagar', state: 'Gujarat', pincode: '382010', phonePrefix: '+91 79' },

  // --- West Bengal ---
  { city: 'Kolkata', state: 'West Bengal', pincode: '700001', phonePrefix: '+91 33' },
  { city: 'Howrah', state: 'West Bengal', pincode: '711101', phonePrefix: '+91 33' },
  { city: 'Durgapur', state: 'West Bengal', pincode: '713201', phonePrefix: '+91 343' },
  { city: 'Asansol', state: 'West Bengal', pincode: '713301', phonePrefix: '+91 341' },
  { city: 'Siliguri', state: 'West Bengal', pincode: '734001', phonePrefix: '+91 353' },

  // --- Rajasthan ---
  { city: 'Jaipur', state: 'Rajasthan', pincode: '302001', phonePrefix: '+91 141' },
  { city: 'Jodhpur', state: 'Rajasthan', pincode: '342001', phonePrefix: '+91 291' },
  { city: 'Kota', state: 'Rajasthan', pincode: '324001', phonePrefix: '+91 744' },
  { city: 'Udaipur', state: 'Rajasthan', pincode: '313001', phonePrefix: '+91 294' },
  { city: 'Ajmer', state: 'Rajasthan', pincode: '305001', phonePrefix: '+91 145' },

  // --- Uttar Pradesh ---
  { city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001', phonePrefix: '+91 522' },
  { city: 'Kanpur', state: 'Uttar Pradesh', pincode: '208001', phonePrefix: '+91 512' },
  { city: 'Varanasi', state: 'Uttar Pradesh', pincode: '221001', phonePrefix: '+91 542' },
  { city: 'Agra', state: 'Uttar Pradesh', pincode: '282001', phonePrefix: '+91 562' },
  { city: 'Prayagraj (Allahabad)', state: 'Uttar Pradesh', pincode: '211001', phonePrefix: '+91 532' },
  { city: 'Meerut', state: 'Uttar Pradesh', pincode: '250001', phonePrefix: '+91 121' },

  // --- Madhya Pradesh ---
  { city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001', phonePrefix: '+91 755' },
  { city: 'Indore', state: 'Madhya Pradesh', pincode: '452001', phonePrefix: '+91 731' },
  { city: 'Jabalpur', state: 'Madhya Pradesh', pincode: '482001', phonePrefix: '+91 761' },
  { city: 'Gwalior', state: 'Madhya Pradesh', pincode: '474001', phonePrefix: '+91 751' },

  // --- Punjab & Chandigarh ---
  { city: 'Chandigarh', state: 'Chandigarh', pincode: '160017', phonePrefix: '+91 172' },
  { city: 'Ludhiana', state: 'Punjab', pincode: '141001', phonePrefix: '+91 161' },
  { city: 'Amritsar', state: 'Punjab', pincode: '143001', phonePrefix: '+91 183' },
  { city: 'Jalandhar', state: 'Punjab', pincode: '144001', phonePrefix: '+91 181' },

  // --- Bihar ---
  { city: 'Patna', state: 'Bihar', pincode: '800001', phonePrefix: '+91 612' },
  { city: 'Gaya', state: 'Bihar', pincode: '823001', phonePrefix: '+91 631' },

  // --- Odisha ---
  { city: 'Bhubaneswar', state: 'Odisha', pincode: '751001', phonePrefix: '+91 674' },
  { city: 'Cuttack', state: 'Odisha', pincode: '753001', phonePrefix: '+91 671' },
  { city: 'Rourkela', state: 'Odisha', pincode: '769001', phonePrefix: '+91 661' },

  // --- Assam ---
  { city: 'Guwahati', state: 'Assam', pincode: '781001', phonePrefix: '+91 361' },

  // --- Puducherry ---
  { city: 'Puducherry', state: 'Puducherry', pincode: '605001', phonePrefix: '+91 413' },
];

/**
 * Find location by city name (case-insensitive)
 */
export function findLocationByCity(cityName: string): CityLocation | undefined {
  if (!cityName) return undefined;
  const clean = cityName.trim().toLowerCase();
  return CITIES_DIRECTORY.find(c => c.city.toLowerCase() === clean);
}

/**
 * Get all cities belonging to a particular state
 */
export function getCitiesByState(stateName: string): CityLocation[] {
  if (!stateName) return CITIES_DIRECTORY;
  const clean = stateName.trim().toLowerCase();
  return CITIES_DIRECTORY.filter(c => c.state.toLowerCase() === clean);
}

/**
 * Infer state from PIN code prefix
 */
export function inferStateFromPincode(pincode: string): string | null {
  const clean = pincode.replace(/\D/g, '');
  if (clean.length < 2) return null;
  const p2 = parseInt(clean.substring(0, 2), 10);
  const p3 = clean.length >= 3 ? parseInt(clean.substring(0, 3), 10) : null;

  // 11: Delhi
  if (p2 === 11) return 'Delhi';
  // 12-13: Haryana
  if (p2 >= 12 && p2 <= 13) return 'Haryana';
  // 14-16: Punjab / Chandigarh
  if (p2 === 16 && p3 && p3 <= 160) return 'Chandigarh';
  if (p2 >= 14 && p2 <= 16) return 'Punjab';
  // 17: Himachal Pradesh
  if (p2 === 17) return 'Himachal Pradesh';
  // 18-19: Jammu & Kashmir
  if (p2 >= 18 && p2 <= 19) return 'Jammu and Kashmir';
  // 20-28: Uttar Pradesh / Uttarakhand
  if (p3 && (p3 >= 244 && p3 <= 249 || p3 === 263)) return 'Uttarakhand';
  if (p2 >= 20 && p2 <= 28) return 'Uttar Pradesh';
  // 30-34: Rajasthan
  if (p2 >= 30 && p2 <= 34) return 'Rajasthan';
  // 36-39: Gujarat
  if (p2 >= 36 && p2 <= 39) return 'Gujarat';
  // 40-44: Maharashtra / Goa
  if (p3 && (p3 === 403)) return 'Goa';
  if (p2 >= 40 && p2 <= 44) return 'Maharashtra';
  // 45-48: Madhya Pradesh / 49: Chhattisgarh
  if (p2 === 49) return 'Chhattisgarh';
  if (p2 >= 45 && p2 <= 48) return 'Madhya Pradesh';
  // 50: Telangana
  if (p2 === 50) return 'Telangana';
  // 51-53: Andhra Pradesh
  if (p2 >= 51 && p2 <= 53) return 'Andhra Pradesh';
  // 56-59: Karnataka
  if (p2 >= 56 && p2 <= 59) return 'Karnataka';
  // 60-64: Tamil Nadu / 605: Puducherry
  if (p3 && p3 === 605) return 'Puducherry';
  if (p2 >= 60 && p2 <= 64) return 'Tamil Nadu';
  // 67-69: Kerala / Lakshadweep
  if (p2 >= 67 && p2 <= 69) return 'Kerala';
  // 70-74: West Bengal
  if (p2 >= 70 && p2 <= 74) return 'West Bengal';
  // 75-77: Odisha
  if (p2 >= 75 && p2 <= 77) return 'Odisha';
  // 78: Assam
  if (p2 === 78) return 'Assam';
  // 80-85: Bihar / Jharkhand
  if (p3 && (p3 >= 814 && p3 <= 835)) return 'Jharkhand';
  if (p2 >= 80 && p2 <= 85) return 'Bihar';

  return null;
}

export interface LocalityItem {
  area: string;
  city: string;
  pincode: string;
}

export const CITY_LOCALITIES_DIRECTORY: LocalityItem[] = [
  // --- Chennai Localities ---
  { area: 'Red Hills', city: 'Chennai', pincode: '600052' },
  { area: 'Madhavaram', city: 'Chennai', pincode: '600060' },
  { area: 'Velachery', city: 'Chennai', pincode: '600042' },
  { area: 'T. Nagar', city: 'Chennai', pincode: '600017' },
  { area: 'Anna Nagar', city: 'Chennai', pincode: '600040' },
  { area: 'Adyar', city: 'Chennai', pincode: '600020' },
  { area: 'Mylapore', city: 'Chennai', pincode: '600004' },
  { area: 'Tambaram', city: 'Chennai', pincode: '600045' },
  { area: 'Guindy', city: 'Chennai', pincode: '600032' },
  { area: 'Porur', city: 'Chennai', pincode: '600116' },
  { area: 'Ambattur', city: 'Chennai', pincode: '600053' },
  { area: 'Nungambakkam', city: 'Chennai', pincode: '600034' },
  { area: 'Royapettah', city: 'Chennai', pincode: '600014' },
  { area: 'Chromepet', city: 'Chennai', pincode: '600044' },
  { area: 'Perambur', city: 'Chennai', pincode: '600011' },
  { area: 'Sholinganallur', city: 'Chennai', pincode: '600119' },
  { area: 'Thiruvanmiyur', city: 'Chennai', pincode: '600041' },
  { area: 'Alwarpet', city: 'Chennai', pincode: '600018' },
  { area: 'Egmore', city: 'Chennai', pincode: '600008' },
  { area: 'Saidapet', city: 'Chennai', pincode: '600015' },
  { area: 'Kilpauk', city: 'Chennai', pincode: '600010' },
  { area: 'Kodambakkam', city: 'Chennai', pincode: '600024' },
  { area: 'Pallavaram', city: 'Chennai', pincode: '600043' },
  { area: 'Avadi', city: 'Chennai', pincode: '600054' },
  { area: 'Poonamallee', city: 'Chennai', pincode: '600056' },
  { area: 'Kolathur', city: 'Chennai', pincode: '600099' },
  { area: 'Villivakkam', city: 'Chennai', pincode: '600049' },
  { area: 'Thoraipakkam (OMR)', city: 'Chennai', pincode: '600097' },
  { area: 'Medavakkam', city: 'Chennai', pincode: '600100' },
  { area: 'Perungudi', city: 'Chennai', pincode: '600096' },
  { area: 'Ashok Nagar', city: 'Chennai', pincode: '600083' },
  { area: 'KK Nagar', city: 'Chennai', pincode: '600078' },
  { area: 'Vadapalani', city: 'Chennai', pincode: '600026' },
  { area: 'Koyambedu', city: 'Chennai', pincode: '600107' },
  { area: 'Mogappair', city: 'Chennai', pincode: '600037' },
  { area: 'Manali', city: 'Chennai', pincode: '600068' },
  { area: 'Tiruvottiyur', city: 'Chennai', pincode: '600019' },

  // --- Coimbatore Localities ---
  { area: 'Gandhipuram', city: 'Coimbatore', pincode: '641012' },
  { area: 'RS Puram', city: 'Coimbatore', pincode: '641002' },
  { area: 'Peelamedu', city: 'Coimbatore', pincode: '641004' },
  { area: 'Saibaba Colony', city: 'Coimbatore', pincode: '641011' },
  { area: 'Saravanampatti', city: 'Coimbatore', pincode: '641035' },
  { area: 'Singanallur', city: 'Coimbatore', pincode: '641005' },
  { area: 'Ukkadam', city: 'Coimbatore', pincode: '641001' },
  { area: 'Vadavalli', city: 'Coimbatore', pincode: '641041' },

  // --- Madurai Localities ---
  { area: 'KK Nagar', city: 'Madurai', pincode: '625020' },
  { area: 'Anna Nagar', city: 'Madurai', pincode: '625020' },
  { area: 'Tallakulam', city: 'Madurai', pincode: '625002' },
  { area: 'Mattuthavani', city: 'Madurai', pincode: '625007' },
  { area: 'Simmakkal', city: 'Madurai', pincode: '625001' },
  { area: 'Thirunagar', city: 'Madurai', pincode: '625006' },

  // --- Bengaluru Localities ---
  { area: 'Indiranagar', city: 'Bengaluru', pincode: '560038' },
  { area: 'Koramangala', city: 'Bengaluru', pincode: '560034' },
  { area: 'Whitefield', city: 'Bengaluru', pincode: '560066' },
  { area: 'Jayanagar', city: 'Bengaluru', pincode: '560011' },
  { area: 'HSR Layout', city: 'Bengaluru', pincode: '560102' },
  { area: 'Electronic City', city: 'Bengaluru', pincode: '560100' },
  { area: 'Malleshwaram', city: 'Bengaluru', pincode: '560003' },
  { area: 'Rajajinagar', city: 'Bengaluru', pincode: '560010' },
  { area: 'Marathahalli', city: 'Bengaluru', pincode: '560037' },
  { area: 'BTM Layout', city: 'Bengaluru', pincode: '560076' },
  { area: 'Hebbal', city: 'Bengaluru', pincode: '560024' },
  { area: 'Yelahanka', city: 'Bengaluru', pincode: '560064' },

  // --- Mumbai Localities ---
  { area: 'Andheri West', city: 'Mumbai', pincode: '400058' },
  { area: 'Andheri East', city: 'Mumbai', pincode: '400069' },
  { area: 'Bandra West', city: 'Mumbai', pincode: '400050' },
  { area: 'Bandra East', city: 'Mumbai', pincode: '400051' },
  { area: 'Borivali', city: 'Mumbai', pincode: '400092' },
  { area: 'Dadar', city: 'Mumbai', pincode: '400014' },
  { area: 'Juhu', city: 'Mumbai', pincode: '400049' },
  { area: 'Powai', city: 'Mumbai', pincode: '400076' },
  { area: 'Malad', city: 'Mumbai', pincode: '400064' },
  { area: 'Colaba', city: 'Mumbai', pincode: '400005' },

  // --- Hyderabad Localities ---
  { area: 'Banjara Hills', city: 'Hyderabad', pincode: '500034' },
  { area: 'Jubilee Hills', city: 'Hyderabad', pincode: '500033' },
  { area: 'Hitec City', city: 'Hyderabad', pincode: '500081' },
  { area: 'Gachibowli', city: 'Hyderabad', pincode: '500032' },
  { area: 'Madhapur', city: 'Hyderabad', pincode: '500081' },
  { area: 'Kukatpally', city: 'Hyderabad', pincode: '500072' },
  { area: 'Secunderabad', city: 'Hyderabad', pincode: '500003' },

  // --- Delhi Localities ---
  { area: 'Connaught Place', city: 'Delhi', pincode: '110001' },
  { area: 'Hauz Khas', city: 'Delhi', pincode: '110016' },
  { area: 'Saket', city: 'Delhi', pincode: '110017' },
  { area: 'Rohini', city: 'Delhi', pincode: '110085' },
  { area: 'Dwarka', city: 'Delhi', pincode: '110075' },
  { area: 'Vasant Kunj', city: 'Delhi', pincode: '110070' },
  { area: 'Karol Bagh', city: 'Delhi', pincode: '110005' },
];

/**
 * Get all specific localities/sub-areas within a selected city
 */
export function getLocalitiesForCity(cityName: string): LocalityItem[] {
  if (!cityName) return [];
  const clean = cityName.trim().toLowerCase();
  return CITY_LOCALITIES_DIRECTORY.filter(l => l.city.toLowerCase() === clean);
}
