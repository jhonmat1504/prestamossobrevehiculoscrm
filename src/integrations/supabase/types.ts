export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          cedula: string
          correo: string | null
          created_at: string
          created_by: string | null
          direccion: string | null
          estado: Database["public"]["Enums"]["cliente_estado"]
          id: string
          nombre: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          cedula: string
          correo?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          estado?: Database["public"]["Enums"]["cliente_estado"]
          id?: string
          nombre: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          cedula?: string
          correo?: string | null
          created_at?: string
          created_by?: string | null
          direccion?: string | null
          estado?: Database["public"]["Enums"]["cliente_estado"]
          id?: string
          nombre?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          correo: string | null
          created_at: string
          id: string
          nombre: string
          updated_at: string
          user_id: string
        }
        Insert: {
          correo?: string | null
          created_at?: string
          id?: string
          nombre: string
          updated_at?: string
          user_id: string
        }
        Update: {
          correo?: string | null
          created_at?: string
          id?: string
          nombre?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transacciones: {
        Row: {
          cliente_id: string
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["transaccion_estado"]
          fecha: string
          id: string
          monto: number
          notas: string | null
          tipo: Database["public"]["Enums"]["transaccion_tipo"]
          updated_at: string
          vehiculo_id: string
          vencimiento: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["transaccion_estado"]
          fecha?: string
          id?: string
          monto?: number
          notas?: string | null
          tipo: Database["public"]["Enums"]["transaccion_tipo"]
          updated_at?: string
          vehiculo_id: string
          vencimiento?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["transaccion_estado"]
          fecha?: string
          id?: string
          monto?: number
          notas?: string | null
          tipo?: Database["public"]["Enums"]["transaccion_tipo"]
          updated_at?: string
          vehiculo_id?: string
          vencimiento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transacciones_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transacciones_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehiculos: {
        Row: {
          anio: number
          color: string | null
          created_at: string
          created_by: string | null
          estado: Database["public"]["Enums"]["vehiculo_estado"]
          id: string
          kilometraje: number
          marca: string
          modelo: string
          notas: string | null
          placa: string
          precio_compra: number
          precio_venta: number
          updated_at: string
        }
        Insert: {
          anio: number
          color?: string | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["vehiculo_estado"]
          id?: string
          kilometraje?: number
          marca: string
          modelo: string
          notas?: string | null
          placa: string
          precio_compra?: number
          precio_venta?: number
          updated_at?: string
        }
        Update: {
          anio?: number
          color?: string | null
          created_at?: string
          created_by?: string | null
          estado?: Database["public"]["Enums"]["vehiculo_estado"]
          id?: string
          kilometraje?: number
          marca?: string
          modelo?: string
          notas?: string | null
          placa?: string
          precio_compra?: number
          precio_venta?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "empleado"
      cliente_estado: "Activo" | "Inactivo" | "Moroso"
      transaccion_estado: "Pendiente" | "Vigente" | "Completada" | "Vencida"
      transaccion_tipo: "Compra" | "Venta" | "Préstamo"
      vehiculo_estado: "Disponible" | "Empeñado" | "Vendido"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "empleado"],
      cliente_estado: ["Activo", "Inactivo", "Moroso"],
      transaccion_estado: ["Pendiente", "Vigente", "Completada", "Vencida"],
      transaccion_tipo: ["Compra", "Venta", "Préstamo"],
      vehiculo_estado: ["Disponible", "Empeñado", "Vendido"],
    },
  },
} as const
