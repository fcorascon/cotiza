export type Cliente = {
  id: string;
  razonSocial: string;
  rfc: string;
  calle: string;
  numero: string;
  colonia: string;
  codigoPostal: string;
  ciudad: string;
  estado: string;
  telefono: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type Unidad = {
  id: string;
  unidad: string;
  createdAt: string;
  updatedAt: string;
};

export type Categoria = {
  id: string;
  categoria: string;
  createdAt: string;
  updatedAt: string;
};

export type Iva = {
  id: string;
  tasa: number;
  createdAt: string;
  updatedAt: string;
};

export type Producto = {
  id: string;
  codigoSat: string;
  descripcion: string;
  unidadId: string;
  categoriaId: string;
  ivaId: string;
  costo: number;
  margen: number;
  subtotal: number;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductoConRelaciones = Producto & {
  unidad: Unidad;
  categoria: Categoria;
  iva: Iva;
};

export type Configuracion = {
  id: string;
  nombreComercial: string;
  razonLegal: string;
  rfc: string;
  direccion: string;
  telefono: string;
  email: string;
  logo: string | null;
  smtpHost: string;
  smtpPuerto: number;
  smtpCifrado: string;
  smtpUsuario: string;
  presupuestoColor: string;
  presupuestoFila: string;
  presupuestoLogo: string | null;
  reciboColor: string;
  reciboFila: string;
  reciboLogo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SeccionApp =
  | "clientes"
  | "unidades"
  | "categorias"
  | "ivas"
  | "productos"
  | "configuracion";
