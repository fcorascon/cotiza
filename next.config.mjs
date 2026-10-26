/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    // En desarrollo los chunks de /_next/static NO llevan hash en el nombre,
    // así que marcarlos como immutable dejaría el browser atorado con el
    // bundle viejo. La caché larga solo aplica en producción (nombres con hash).
    const cacheEstatico =
      process.env.NODE_ENV === "production"
        ? "public, max-age=31536000, immutable"
        : "no-cache, no-store, must-revalidate";
    return [
      {
        // Los assets estáticos tienen hash en el nombre: cachearlos sin problema.
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: cacheEstatico,
          },
        ],
      },
      {
        // Nunca cachear el HTML de las páginas: la app es dinámica (sesión,
        // configuración de empresa) y evita que quede pegado al build anterior.
        // Se excluye /_next/static de esta regla.
        source: "/((?!_next/static/).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
