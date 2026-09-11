export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          type: ProductType;
          fabric: string;
          description: string | null;
          colors: string[];
          sizes: string[];
          image_urls: string[];
          price: number;
          currency: string;
          customization_enabled: boolean;
          out_of_stock: boolean;
          discount_active: boolean;
          discount_percentage: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string;
          type: ProductType;
          fabric?: string;
          description?: string | null;
          colors?: string[];
          sizes?: string[];
          image_urls?: string[];
          price: number;
          currency?: string;
          customization_enabled?: boolean;
          out_of_stock?: boolean;
          discount_active?: boolean;
          discount_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      preset_logos: {
        Row: {
          id: string;
          image_url: string;
          label: string;
          category: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          image_url: string;
          label: string;
          category?: string;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["preset_logos"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          customer_name: string;
          phone_1: string;
          phone_2: string;
          address: string;
          city: string;
          subtotal: number;
          deposit_amount: number;
          remaining_amount: number;
          payment_method: PaymentMethod;
          payment_proof_url: string | null;
          status: OrderStatus;
          created_at: string;
          updated_at: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          order_number: string;
          customer_name: string;
          phone_1: string;
          phone_2: string;
          address: string;
          city: string;
          subtotal: number;
          deposit_amount: number;
          remaining_amount: number;
          payment_method: PaymentMethod;
          payment_proof_url?: string | null;
          status?: OrderStatus;
          created_at?: string;
          updated_at?: string;
          notes?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          size: string;
          color: string;
          quantity: number;
          unit_price: number;
          customization_type: CustomizationType;
          customization_logo_url_or_preset_id: string | null;
          name_tag_text: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          size: string;
          color: string;
          quantity: number;
          unit_price: number;
          customization_type?: CustomizationType;
          customization_logo_url_or_preset_id?: string | null;
          name_tag_text?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [];
      };
      payment_methods: {
        Row: {
          id: string;
          method: PaymentMethod;
          phone_number: string;
          account_holder: string;
          is_active: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          method: PaymentMethod;
          phone_number: string;
          account_holder?: string;
          is_active?: boolean;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["payment_methods"]["Insert"]
        >;
      };
      settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["settings"]["Insert"]>;
        Relationships: [];
      };
      gallery_images: {
        Row: {
          id: string;
          image_url: string;
          alt: string;
          orientation: GalleryOrientation;
          active: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          image_url: string;
          alt?: string;
          orientation?: GalleryOrientation;
          active?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["gallery_images"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      product_type: ProductType;
      payment_method: PaymentMethod;
      order_status: OrderStatus;
      customization_type: CustomizationType;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type ProductType =
  | "scrub-half"
  | "scrub-full"
  | "coat-men"
  | "coat-women";

export type PaymentMethod = "instapay" | "orange_cash";

export type GalleryOrientation = "square" | "portrait" | "landscape";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type CustomizationType = "none" | "uploaded" | "preset";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type PresetLogo = Database["public"]["Tables"]["preset_logos"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type PaymentMethodRow =
  Database["public"]["Tables"]["payment_methods"]["Row"];
export type GalleryImage =
  Database["public"]["Tables"]["gallery_images"]["Row"];

export type OrderWithItems = Order & { order_items: OrderItem[] };

export type CartItem = {
  key: string;
  productId: string;
  name: string;
  image_url: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  customization?: {
    type: CustomizationType;
    logo_url: string | null;
    preset_id: string | null;
    name_tag_text: string;
  };
};