export class User {
  id: number;
  lastname: string;
  firstname: string;
  email: string;
  password: string;
  role: string;
  address: string;
  publisher_request: boolean;
  publisher_request_details: Record<string, string>;
  publisher_request_submitted_at: string;
  enabled: boolean;
}
