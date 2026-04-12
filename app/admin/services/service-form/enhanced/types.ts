export type ServiceFormData = {
  name: string;
  description: string;
  category: string;
  duration_minutes: number;
  price: number;
  deposit_amount: number;
  max_capacity: number;
  buffer_minutes: number;
  image_url: string;
  image_urls: string[];
  is_active: boolean;
  tags: string;
  inclusions: string;
  prep_notes: string;
  location_ids: string[];
};

export type UpdateServiceField = <K extends keyof ServiceFormData>(
  field: K,
  value: ServiceFormData[K],
) => void;
