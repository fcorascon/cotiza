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

export type SeccionApp = "clientes" | "unidades" | "categorias" | "ivas";
