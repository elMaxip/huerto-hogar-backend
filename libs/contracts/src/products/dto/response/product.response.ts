export interface ProductResponse {
  id: string;
  name: string;
  category: string;
  price: number;
  discount?: number;
  unidadVenta: string;
  img: string;
  stock: number;
  description: string;
}
