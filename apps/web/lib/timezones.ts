const FALLBACK_TIMEZONES = [
  "UTC",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
  "America/Anchorage",
  "America/Argentina/Buenos_Aires",
  "America/Chicago",
  "America/Denver",
  "America/Halifax",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Phoenix",
  "America/Sao_Paulo",
  "America/St_Johns",
  "Asia/Bangkok",
  "Asia/Dhaka",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Jakarta",
  "Asia/Jerusalem",
  "Asia/Karachi",
  "Asia/Kathmandu",
  "Asia/Kolkata",
  "Asia/Manila",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Melbourne",
  "Australia/Perth",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Athens",
  "Europe/Berlin",
  "Europe/Brussels",
  "Europe/Budapest",
  "Europe/Copenhagen",
  "Europe/Dublin",
  "Europe/Helsinki",
  "Europe/Istanbul",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Moscow",
  "Europe/Oslo",
  "Europe/Paris",
  "Europe/Prague",
  "Europe/Rome",
  "Europe/Stockholm",
  "Europe/Vienna",
  "Europe/Warsaw",
  "Pacific/Auckland",
  "Pacific/Fiji",
  "Pacific/Honolulu"
];

function detectIntlTimezones() {
  const provider = Intl as typeof Intl & {
    supportedValuesOf?: (key: string) => string[];
  };

  if (typeof provider.supportedValuesOf !== "function") return [];

  try {
    return provider.supportedValuesOf("timeZone");
  } catch {
    return [];
  }
}

export function getTimezoneOptions(...preferredTimezones: Array<string | null | undefined>) {
  const options = new Set<string>(["UTC"]);

  preferredTimezones.forEach((tz) => {
    if (tz && tz.trim().length > 0) {
      options.add(tz.trim());
    }
  });

  const intlTimezones = detectIntlTimezones();
  const zones = intlTimezones.length > 0 ? intlTimezones : FALLBACK_TIMEZONES;
  zones.forEach((zone) => options.add(zone));

  return Array.from(options).sort((a, b) => a.localeCompare(b));
}
