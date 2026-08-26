/**
 * Smart Meta/Facebook Lead Field Key Normalizer & Extractor
 * Prevents array index mismatches and accurately extracts CRM columns.
 */
export interface ExtractedLeadFields {
  fullName: string;
  phone: string;
  email: string;
  location: string;
  budget: string;
  eventDate: string;
  rawFieldMap: Record<string, string>;
}

export function extractLeadFields(fieldData: Array<{ name: string; values: string[] }> | Record<string, any>): ExtractedLeadFields {
  const rawFieldMap: Record<string, string> = {};

  if (Array.isArray(fieldData)) {
    fieldData.forEach((field) => {
      if (field?.name) {
        const key = field.name.toLowerCase().trim();
        const val = Array.isArray(field.values) ? field.values[0] || '' : (field as any).value || '';
        rawFieldMap[key] = String(val).trim();
      }
    });
  } else if (typeof fieldData === 'object' && fieldData !== null) {
    Object.keys(fieldData).forEach((k) => {
      const key = k.toLowerCase().trim();
      const val = fieldData[k];
      rawFieldMap[key] = String(val || '').trim();
    });
  }

  const getField = (...keys: string[]): string => {
    for (const k of keys) {
      const lowerKey = k.toLowerCase();
      // 1. Exact match
      if (rawFieldMap[lowerKey]) return rawFieldMap[lowerKey];
      // 2. Partial substring match
      for (const [fieldName, val] of Object.entries(rawFieldMap)) {
        if (fieldName.includes(lowerKey) && val) {
          return val;
        }
      }
    }
    return '';
  };

  const fullName = getField('full_name', 'name', 'first_name', 'client_name', 'customer_name') || 'Facebook Lead';
  const phone = getField('phone', 'phone_number', 'mobile', 'contact', 'whatsapp', 'phone_no');
  const email = getField('email', 'email_address', 'work_email');
  const location = getField('city', 'location', 'address', 'state', 'venue', 'wedding_location', 'event_location');
  const budget = getField('budget', 'package', 'price', 'investment', 'approximate_budget', 'expected_budget');
  const eventDate = getField('event_date', 'wedding_date', 'shoot_date', 'date_of_event', 'date', 'event_month');

  return {
    fullName,
    phone,
    email,
    location,
    budget,
    eventDate,
    rawFieldMap,
  };
}
