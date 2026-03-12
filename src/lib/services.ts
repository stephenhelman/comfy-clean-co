export interface Service {
  id: string;
  titleKey: string;
  descKey: string;
  icon: string;
  features: string[];
}

export const services: Service[] = [
  {
    id: "residential",
    titleKey: "services.residential_title",
    descKey: "services.residential_desc",
    icon: "Home",
    features: ["Deep Clean", "Standard Clean", "Move-in/Move-out"],
  },
  {
    id: "commercial",
    titleKey: "services.commercial_title",
    descKey: "services.commercial_desc",
    icon: "Building2",
    features: ["Offices", "Retail Spaces", "Small Commercial"],
  },
  {
    id: "recurring",
    titleKey: "services.recurring_title",
    descKey: "services.recurring_desc",
    icon: "CalendarCheck",
    features: ["Weekly", "Bi-weekly", "Monthly"],
  },
];

export interface BookingData {
  name: string;
  phone: string;
  email: string;
  address: string;
  serviceType: string;
  frequency: string;
  homeSize: string;
  preferredDate: string;
  preferredTime: string;
  notes: string;
  languagePreference: string;
}
