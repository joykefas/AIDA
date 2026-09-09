declare global {
  type LayoutProps<T = unknown> = {
    children: React.ReactNode;
    params?: Promise<T extends Record<string, string | string[]> ? T : Record<string, string | string[]>>;
  };

  type PageProps<T = Record<string, string | string[]>> = {
    params?: Promise<T>;
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
  };
}

export {};
