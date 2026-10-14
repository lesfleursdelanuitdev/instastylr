// Vite turns an imported image into its built URL.
declare module "*.jpg" {
  const url: string;
  export default url;
}
