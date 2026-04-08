export interface Config {
  devices: [
    {
      name: string;
      ingress: Record<
        string,
        {
          id: string;
          [key: string]: string;
        }
      >;
      egress: Record<
        string,
        {
          id: string;
          [key: string]: string;
        }
      >;
    },
  ];
  plugins: {
    ingress: Record<string, Record<string, string>>;
    egress: Record<string, Record<string, string>>;
  };
}
