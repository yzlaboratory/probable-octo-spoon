/// <reference types="vite/client" />

declare module "slug" {
  interface SlugOptions {
    lower?: boolean;
    replacement?: string;
    remove?: RegExp;
  }
  function slug(input: string, options?: SlugOptions): string;
  export default slug;
}
