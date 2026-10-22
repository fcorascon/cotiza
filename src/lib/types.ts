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

export type PresupuestoItem = {
  id: string;
  presupuestoId: string;
  productoId: string | null;
  descripcion: string;
  codigoSat: string | null;
  unidad: string | null;
  cantidad: number;
  precioUnitario: number;
  importe: number;
  ivaTasa: number;
  ivaImporte: number;
  orden: number;
};

export type Presupuesto = {
  id: string;
  clienteId: string;
  fecha: string;
  observaciones: string | null;
  subtotal: number;
  iva: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  /** Cliente con datos completos (para la tabla y el documento impreso). */
  cliente: Cliente;
  items: PresupuestoItem[];
};

/** Partida enviada desde el formulario (fotografía del producto + cantidad). */
export type PresupuestoItemPayload = {
  productoId: string | null;
  descripcion: string;
  codigoSat: string | null;
  unidad: string | null;
  cantidad: number;
  precioUnitario: number;
  ivaTasa: number;
};

export type PresupuestoPayload = {
  clienteId: string;
  fecha: string;
  observaciones: string | null;
  items: PresupuestoItemPayload[];
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
  colorPrimario: string;
  createdAt: string;
  updatedAt: string;
};

/** Registro de la bitácora de correos enviados. */
export type EnvioCorreo = {
  id: string;
  presupuestoId: string | null;
  presupuesto: {
    cliente: { razonSocial: string };
  } | null;
  destino: string;
  asunto: string;
  estado: string;
  error: string | null;
  messageId: string | null;
  createdAt: string;
};

export type SeccionApp =
  | "clientes"
  | "presupuestos"
  | "unidades"
  | "categorias"
  | "ivas"
  | "productos"
  | "configuracion";
