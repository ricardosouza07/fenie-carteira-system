export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Enums: {
      user_role:
        | "admin"
        | "supervisor"
        | "operador_interno"
        | "vendedor_interno"
        | "vendedor_externo";
      customer_health_status: "saudavel" | "atencao" | "risco" | "inativo";
      work_status:
        | "nao_trabalhado"
        | "contatado"
        | "aguardando"
        | "convertido"
        | "visita";
      customer_type: "loja" | "externo" | "novo" | "espontaneo";
      interaction_channel: "whatsapp" | "telefone" | "email" | "presencial";
      follow_up_status: "aberto" | "vencido" | "concluido";
      import_status: "rascunho" | "validada" | "publicada" | "erro";
      customer_financial_status:
        | "adimplente"
        | "inadimplente"
        | "bloqueado"
        | "negociacao";
      customer_portfolio_status:
        | "ativo"
        | "fechou_salao"
        | "mudou_de_ramo"
        | "sem_potencial"
        | "duplicado"
        | "arquivado";
    };
    Tables: {
      profiles: {
        Row: {
          id: string;
          salesperson_id: string | null;
          full_name: string;
          email: string;
          role: Database["public"]["Enums"]["user_role"];
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          salesperson_id?: string | null;
          full_name: string;
          email: string;
          role?: Database["public"]["Enums"]["user_role"];
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      salespeople: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["salespeople"]["Insert"]>;
      };
      salesperson_aliases: {
        Row: {
          id: string;
          salesperson_id: string;
          alias: string;
          normalized_alias: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          salesperson_id: string;
          alias: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["salesperson_aliases"]["Insert"]
        >;
      };
      customers: {
        Row: {
          id: string;
          legal_name: string | null;
          trade_name: string | null;
          document: string | null;
          document_normalized: string | null;
          state_registration: string | null;
          legal_name_normalized: string | null;
          trade_name_normalized: string | null;
          city_normalized: string | null;
          email: string | null;
          phone_primary: string | null;
          phone_normalized: string;
          city: string | null;
          state: string | null;
          district: string | null;
          zip_code: string | null;
          address: string | null;
          assigned_salesperson_id: string | null;
          last_order_number: string | null;
          last_order_salesperson_name: string | null;
          last_order_date: string | null;
          last_order_value: number;
          days_without_buying: number;
          average_purchase_cycle_days: number | null;
          next_purchase_date: string | null;
          original_situation: string | null;
          registration_date: string | null;
          registration_origin: string | null;
          mercos_situation: string | null;
          b2b_access: string | null;
          segment: string | null;
          customer_tags: string | null;
          next_task: string | null;
          task_date: string | null;
          health_status: Database["public"]["Enums"]["customer_health_status"];
          financial_status: Database["public"]["Enums"]["customer_financial_status"];
          financial_note: string | null;
          portfolio_status: Database["public"]["Enums"]["customer_portfolio_status"];
          portfolio_status_note: string | null;
          work_status: Database["public"]["Enums"]["work_status"];
          last_action_label: string | null;
          last_action_at: string | null;
          source_import_id: string | null;
          external_key: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          legal_name?: string | null;
          trade_name?: string | null;
          document?: string | null;
          document_normalized?: string | null;
          state_registration?: string | null;
          legal_name_normalized?: string | null;
          trade_name_normalized?: string | null;
          city_normalized?: string | null;
          email?: string | null;
          phone_primary?: string | null;
          city?: string | null;
          state?: string | null;
          district?: string | null;
          zip_code?: string | null;
          address?: string | null;
          assigned_salesperson_id?: string | null;
          last_order_number?: string | null;
          last_order_salesperson_name?: string | null;
          last_order_date?: string | null;
          last_order_value?: number;
          days_without_buying?: number;
          average_purchase_cycle_days?: number | null;
          next_purchase_date?: string | null;
          original_situation?: string | null;
          registration_date?: string | null;
          registration_origin?: string | null;
          mercos_situation?: string | null;
          b2b_access?: string | null;
          segment?: string | null;
          customer_tags?: string | null;
          next_task?: string | null;
          task_date?: string | null;
          health_status?: Database["public"]["Enums"]["customer_health_status"];
          financial_status?: Database["public"]["Enums"]["customer_financial_status"];
          financial_note?: string | null;
          portfolio_status?: Database["public"]["Enums"]["customer_portfolio_status"];
          portfolio_status_note?: string | null;
          work_status?: Database["public"]["Enums"]["work_status"];
          last_action_label?: string | null;
          last_action_at?: string | null;
          source_import_id?: string | null;
          external_key?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["customers"]["Insert"]>;
      };
      customer_contacts: GenericTable;
      portfolio_imports: GenericTable;
      portfolio_import_rows: GenericTable;
      portfolio_items: GenericTable;
      customer_interactions: GenericTable;
      follow_ups: GenericTable;
      goals: GenericTable;
      point_events: GenericTable;
      performance_campaigns: GenericTable;
      performance_campaign_levels: GenericTable;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

type GenericTable = {
  Row: Record<string, Json>;
  Insert: Record<string, Json | undefined>;
  Update: Record<string, Json | undefined>;
};
