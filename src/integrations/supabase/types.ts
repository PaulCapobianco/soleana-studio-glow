export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string;
          display_order: number;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      contact_requests: {
        Row: {
          created_at: string;
          desired_date: string | null;
          email: string;
          first_name: string;
          id: string;
          internal_note: string | null;
          last_name: string;
          location: string | null;
          message: string;
          consent: boolean;
          phone: string | null;
          session_type: string;
          status: Database["public"]["Enums"]["request_status"];
        };
        Insert: {
          created_at?: string;
          desired_date?: string | null;
          email: string;
          first_name: string;
          id?: string;
          internal_note?: string | null;
          last_name: string;
          location?: string | null;
          message: string;
          consent?: boolean;
          phone?: string | null;
          session_type: string;
          status?: Database["public"]["Enums"]["request_status"];
        };
        Update: {
          created_at?: string;
          desired_date?: string | null;
          email?: string;
          first_name?: string;
          id?: string;
          internal_note?: string | null;
          last_name?: string;
          location?: string | null;
          message?: string;
          consent?: boolean;
          phone?: string | null;
          session_type?: string;
          status?: Database["public"]["Enums"]["request_status"];
        };
        Relationships: [];
      };
      faq: {
        Row: {
          answer: string;
          created_at: string;
          display_order: number;
          id: string;
          published: boolean;
          question: string;
        };
        Insert: {
          answer: string;
          created_at?: string;
          display_order?: number;
          id?: string;
          published?: boolean;
          question: string;
        };
        Update: {
          answer?: string;
          created_at?: string;
          display_order?: number;
          id?: string;
          published?: boolean;
          question?: string;
        };
        Relationships: [];
      };
      photo_placements: {
        Row: {
          alt_text_override: string | null;
          category_id: string | null;
          context_type: string;
          created_at: string;
          display_order: number;
          id: string;
          object_position_x_pct: number;
          object_position_y_pct: number;
          page_key: string | null;
          photo_id: string;
          placement_key: string;
          published: boolean;
          seo_page_id: string | null;
          slot: string;
          updated_at: string;
        };
        Insert: {
          alt_text_override?: string | null;
          category_id?: string | null;
          context_type: string;
          created_at?: string;
          display_order: number;
          id?: string;
          object_position_x_pct?: number;
          object_position_y_pct?: number;
          page_key?: string | null;
          photo_id: string;
          placement_key: string;
          published?: boolean;
          seo_page_id?: string | null;
          slot: string;
          updated_at?: string;
        };
        Update: {
          alt_text_override?: string | null;
          category_id?: string | null;
          context_type?: string;
          created_at?: string;
          display_order?: number;
          id?: string;
          object_position_x_pct?: number;
          object_position_y_pct?: number;
          page_key?: string | null;
          photo_id?: string;
          placement_key?: string;
          published?: boolean;
          seo_page_id?: string | null;
          slot?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photo_placements_photo_id_fkey";
            columns: ["photo_id"];
            isOneToOne: false;
            referencedRelation: "photos";
            referencedColumns: ["id"];
          },
        ];
      };
      photo_variants: {
        Row: {
          byte_size: number;
          created_at: string;
          height: number;
          id: string;
          photo_id: string;
          sha256: string;
          storage_path: string;
          width: number;
        };
        Insert: {
          byte_size: number;
          created_at?: string;
          height: number;
          id?: string;
          photo_id: string;
          sha256: string;
          storage_path: string;
          width: number;
        };
        Update: {
          byte_size?: number;
          created_at?: string;
          height?: number;
          id?: string;
          photo_id?: string;
          sha256?: string;
          storage_path?: string;
          width?: number;
        };
        Relationships: [
          {
            foreignKeyName: "photo_variants_photo_id_fkey";
            columns: ["photo_id"];
            isOneToOne: false;
            referencedRelation: "photos";
            referencedColumns: ["id"];
          },
        ];
      };
      photos: {
        Row: {
          alt_text: string;
          category_id: string | null;
          created_at: string;
          display_order: number;
          id: string;
          image_url: string;
          location: string | null;
          on_home: boolean;
          on_portfolio: boolean;
          published: boolean;
          source_key: string | null;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          alt_text?: string;
          category_id?: string | null;
          created_at?: string;
          display_order?: number;
          id?: string;
          image_url: string;
          location?: string | null;
          on_home?: boolean;
          on_portfolio?: boolean;
          published?: boolean;
          source_key?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          alt_text?: string;
          category_id?: string | null;
          created_at?: string;
          display_order?: number;
          id?: string;
          image_url?: string;
          location?: string | null;
          on_home?: boolean;
          on_portfolio?: boolean;
          published?: boolean;
          source_key?: string | null;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photos_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          comment: string;
          created_at: string;
          display_order: number;
          first_name: string;
          google_review_url: string | null;
          id: string;
          published: boolean;
          rating: number;
          review_date: string | null;
          session_type: string | null;
        };
        Insert: {
          comment: string;
          created_at?: string;
          display_order?: number;
          first_name: string;
          google_review_url?: string | null;
          id?: string;
          published?: boolean;
          rating?: number;
          review_date?: string | null;
          session_type?: string | null;
        };
        Update: {
          comment?: string;
          created_at?: string;
          display_order?: number;
          first_name?: string;
          google_review_url?: string | null;
          id?: string;
          published?: boolean;
          rating?: number;
          review_date?: string | null;
          session_type?: string | null;
        };
        Relationships: [];
      };
      seo_pages: {
        Row: {
          content: string;
          cta_label: string;
          h1: string;
          id: string;
          image_alt: string | null;
          image_url: string | null;
          intro: string;
          meta_description: string;
          meta_title: string;
          og_description: string | null;
          og_title: string | null;
          published: boolean;
          slug: string;
          updated_at: string;
        };
        Insert: {
          content: string;
          cta_label?: string;
          h1: string;
          id?: string;
          image_alt?: string | null;
          image_url?: string | null;
          intro: string;
          meta_description: string;
          meta_title: string;
          og_description?: string | null;
          og_title?: string | null;
          published?: boolean;
          slug: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          cta_label?: string;
          h1?: string;
          id?: string;
          image_alt?: string | null;
          image_url?: string | null;
          intro?: string;
          meta_description?: string;
          meta_title?: string;
          og_description?: string | null;
          og_title?: string | null;
          published?: boolean;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          display_order: number;
          duration: string;
          featured: boolean;
          features: string[];
          id: string;
          name: string;
          photo_count: string;
          price_eur: number;
          slug: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          duration: string;
          featured?: boolean;
          features?: string[];
          id?: string;
          name: string;
          photo_count: string;
          price_eur: number;
          slug: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          duration?: string;
          featured?: boolean;
          features?: string[];
          id?: string;
          name?: string;
          photo_count?: string;
          price_eur?: number;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          email: string;
          footer_text: string;
          google_business_url: string | null;
          google_review_url: string | null;
          id: number;
          instagram_url: string | null;
          legal_info: string | null;
          phone: string | null;
          service_area: string;
          studio_name: string;
          tiktok_url: string | null;
          updated_at: string;
          whatsapp_enabled: boolean;
          whatsapp_url: string | null;
        };
        Insert: {
          email?: string;
          footer_text?: string;
          google_business_url?: string | null;
          google_review_url?: string | null;
          id?: number;
          instagram_url?: string | null;
          legal_info?: string | null;
          phone?: string | null;
          service_area?: string;
          studio_name?: string;
          tiktok_url?: string | null;
          updated_at?: string;
          whatsapp_enabled?: boolean;
          whatsapp_url?: string | null;
        };
        Update: {
          email?: string;
          footer_text?: string;
          google_business_url?: string | null;
          google_review_url?: string | null;
          id?: number;
          instagram_url?: string | null;
          legal_info?: string | null;
          phone?: string | null;
          service_area?: string;
          studio_name?: string;
          tiktok_url?: string | null;
          updated_at?: string;
          whatsapp_enabled?: boolean;
          whatsapp_url?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin";
      request_status: "nouveau" | "repondu" | "reserve" | "termine" | "archive";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
      request_status: ["nouveau", "repondu", "reserve", "termine", "archive"],
    },
  },
} as const;
