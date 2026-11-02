export type Category = { id: number; name: string };

export type Product = {
  id: string;
  seller_id: string;
  category_id: number | null;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type ProductWithCategory = Product & {
  categories: { name: string } | null;
};
