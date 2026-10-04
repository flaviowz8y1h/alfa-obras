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
      dCategoriaGastos: {
        Row: {
          Atualizado_Em: string | null
          Atualizado_Por: string | null
          Criado_Em: string
          Criado_Por: string | null
          Grupo_DRE: string | null
          ID_Categoria: string
          ID_Empresa: string
          Impacta_Obra: string | null
          Nome_Categoria: string | null
          Status: string | null
          Tipo_Custo: string | null
        }
        Insert: {
          Atualizado_Em?: string | null
          Atualizado_Por?: string | null
          Criado_Em?: string
          Criado_Por?: string | null
          Grupo_DRE?: string | null
          ID_Categoria: string
          ID_Empresa: string
          Impacta_Obra?: string | null
          Nome_Categoria?: string | null
          Status?: string | null
          Tipo_Custo?: string | null
        }
        Update: {
          Atualizado_Em?: string | null
          Atualizado_Por?: string | null
          Criado_Em?: string
          Criado_Por?: string | null
          Grupo_DRE?: string | null
          ID_Categoria?: string
          ID_Empresa?: string
          Impacta_Obra?: string | null
          Nome_Categoria?: string | null
          Status?: string | null
          Tipo_Custo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dCategoriaGastos_Atualizado_Por_fkey"
            columns: ["Atualizado_Por"]
            isOneToOne: false
            referencedRelation: "dUsuarios"
            referencedColumns: ["ID_Usuario"]
          },
          {
            foreignKeyName: "dCategoriaGastos_Criado_Por_fkey"
            columns: ["Criado_Por"]
            isOneToOne: false
            referencedRelation: "dUsuarios"
            referencedColumns: ["ID_Usuario"]
          },
          {
            foreignKeyName: "dCategoriaGastos_ID_Empresa_fkey"
            columns: ["ID_Empresa"]
            isOneToOne: false
            referencedRelation: "dEmpresas"
            referencedColumns: ["ID_Empresa"]
          },
        ]
      }
      dClientes: {
        Row: {
          Atualizado_Em: string | null
          Atualizado_Por: string | null
          Criado_Em: string
          Criado_Por: string | null
          ID_Cliente: string
          ID_Empresa: string
          Nome_Cliente: string | null
          Status: string | null
          Telefone_Cliente: string | null
        }
        Insert: {
          Atualizado_Em?: string | null
          Atualizado_Por?: string | null
          Criado_Em?: string
          Criado_Por?: string | null
          ID_Cliente: string
          ID_Empresa: string
          Nome_Cliente?: string | null
          Status?: string | null
          Telefone_Cliente?: string | null
        }
        Update: {
          Atualizado_Em?: string | null
          Atualizado_Por?: string | null
          Criado_Em?: string
          Criado_Por?: string | null
          ID_Cliente?: string
          ID_Empresa?: string
          Nome_Cliente?: string | null
          Status?: string | null
          Telefone_Cliente?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dClientes_Atualizado_Por_fkey"
            columns: ["Atualizado_Por"]
            isOneToOne: false
            referencedRelation: "dUsuarios"
            referencedColumns: ["ID_Usuario"]
          },
          {
            foreignKeyName: "dClientes_Criado_Por_fkey"
            columns: ["Criado_Por"]
            isOneToOne: false
            referencedRelation: "dUsuarios"
            referencedColumns: ["ID_Usuario"]
          },
          {
            foreignKeyName: "dClientes_ID_Empresa_fkey"
            columns: ["ID_Empresa"]
            isOneToOne: false
            referencedRelation: "dEmpresas"
            referencedColumns: ["ID_Empresa"]
          },
        ]
      }
      dEmpresas: {
        Row: {
          Atualizado_Em: string | null
          Atualizado_Por: string | null
          CNPJ_CPF: string | null
          Criado_Em: string
          Criado_Por: string | null
          ID_Empresa: string
          Nome_Empresa: string | null
          Status: string | null
        }
        Insert: {
          Atualizado_Em?: string | null
          Atualizado_Por?: string | null
          CNPJ_CPF?: string | null
          Criado_Em?: string
          Criado_Por?: string | null
          ID_Empresa: string
          Nome_Empresa?: string | null
          Status?: string | null
        }
        Update: {
          Atualizado_Em?: string | null
          Atualizado_Por?: string | null
          CNPJ_CPF?: string | null
          Criado_Em?: string
          Criado_Por?: string | null
          ID_Empresa?: string
          Nome_Empresa?: string | null
          Status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dEmpresas_Atualizado_Por_fkey"
            columns: ["Atualizado_Por"]
            isOneToOne: false
            referencedRelation: "dUsuarios"
            referencedColumns: ["ID_Usuario"]
          },
          {
            foreignKeyName: "dEmpresas_Criado_Por_fkey"
            columns: ["Criado_Por"]
            isOneToOne: false
            referencedRelation: "dUsuarios"
            referencedColumns: ["ID_Usuario"]
          },
        ]
      }
      dObras: {
        Row: {
          Atualizado_Em: string | null
          Atualizado_Por: string | null
          Criado_Em: string
          Criado_Por: string | null
          Data_Inicio: string | null
          ID_Cliente: string | null
          ID_Empresa: string | null
          ID_Obra: string
          Nome_Obra: string | null
          Previsao_Termino: string | null
          Status: string | null
          Valor_Contratado: number | null
        }
        Insert: {
          Atualizado_Em?: string | null
          Atualizado_Por?: string | null
          Criado_Em?: string
          Criado_Por?: string | null
          Data_Inicio?: string | null
          ID_Cliente?: string | null
          ID_Empresa?: string | null
          ID_Obra: string
          Nome_Obra?: string | null
          Previsao_Termino?: string | null
          Status?: string | null
          Valor_Contratado?: number | null
        }
        Update: {
          Atualizado_Em?: string | null
          Atualizado_Por?: string | null
          Criado_Em?: string
          Criado_Por?: string | null
          Data_Inicio?: string | null
          ID_Cliente?: string | null
          ID_Empresa?: string | null
          ID_Obra?: string
          Nome_Obra?: string | null
          Previsao_Termino?: string | null
          Status?: string | null
          Valor_Contratado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dObras_Atualizado_Por_fkey"
            columns: ["Atualizado_Por"]
            isOneToOne: false
            referencedRelation: "dUsuarios"
            referencedColumns: ["ID_Usuario"]
          },
          {
            foreignKeyName: "dObras_Criado_Por_fkey"
            columns: ["Criado_Por"]
            isOneToOne: false
            referencedRelation: "dUsuarios"
            referencedColumns: ["ID_Usuario"]
          },
          {
            foreignKeyName: "dObras_ID_Cliente_fkey"
            columns: ["ID_Empresa", "ID_Cliente"]
            isOneToOne: false
            referencedRelation: "dClientes"
            referencedColumns: ["ID_Empresa", "ID_Cliente"]
          },
          {
            foreignKeyName: "dObras_ID_Empresa_fkey"
            columns: ["ID_Empresa"]
            isOneToOne: false
            referencedRelation: "dEmpresas"
            referencedColumns: ["ID_Empresa"]
          },
        ]
      }
      dTrabalhadores: {
        Row: {
          Atualizado_Em: string | null
          Atualizado_Por: string | null
          Chave_PIX: string | null
          Criado_Em: string
          Criado_Por: string | null
          Funcao: string | null
          ID_Empresa: string
          ID_Trabalhador: string
          Nome_Trabalhador: string | null
          Status: string | null
          Tipo_Vinc_Contrato: string | null
          Valor_Diaria_Padrao: number | null
        }
        Insert: {
          Atualizado_Em?: string | null
          Atualizado_Por?: string | null
          Chave_PIX?: string | null
          Criado_Em?: string
          Criado_Por?: string | null
          Funcao?: string | null
          ID_Empresa: string
          ID_Trabalhador: string
          Nome_Trabalhador?: string | null
          Status?: string | null
          Tipo_Vinc_Contrato?: string | null
          Valor_Diaria_Padrao?: number | null
        }
        Update: {
          Atualizado_Em?: string | null
          Atualizado_Por?: string | null
          Chave_PIX?: string | null
          Criado_Em?: string
          Criado_Por?: string | null
          Funcao?: string | null
          ID_Empresa?: string
          ID_Trabalhador?: string
          Nome_Trabalhador?: string | null
          Status?: string | null
          Tipo_Vinc_Contrato?: string | null
          Valor_Diaria_Padrao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dTrabalhadores_Atualizado_Por_fkey"
            columns: ["Atualizado_Por"]
            isOneToOne: false
            referencedRelation: "dUsuarios"
            referencedColumns: ["ID_Usuario"]
          },
          {
            foreignKeyName: "dTrabalhadores_Criado_Por_fkey"
            columns: ["Criado_Por"]
            isOneToOne: false
            referencedRelation: "dUsuarios"
            referencedColumns: ["ID_Usuario"]
          },
          {
            foreignKeyName: "dTrabalhadores_ID_Empresa_fkey"
            columns: ["ID_Empresa"]
            isOneToOne: false
            referencedRelation: "dEmpresas"
            referencedColumns: ["ID_Empresa"]
          },
        ]
      }
      dUsuarios: {
        Row: {
          Atualizado_Em: string | null
          Criado_Em: string
          ID_Empresa: string
          ID_Usuario: string
          Nome: string | null
          Perfil: string
          Status: string
        }
        Insert: {
          Atualizado_Em?: string | null
          Criado_Em?: string
          ID_Empresa: string
          ID_Usuario: string
          Nome?: string | null
          Perfil: string
          Status?: string
        }
        Update: {
          Atualizado_Em?: string | null
          Criado_Em?: string
          ID_Empresa?: string
          ID_Usuario?: string
          Nome?: string | null
          Perfil?: string
          Status?: string
        }
        Relationships: [
          {
            foreignKeyName: "dUsuarios_ID_Empresa_fkey"
            columns: ["ID_Empresa"]
            isOneToOne: false
            referencedRelation: "dEmpresas"
            referencedColumns: ["ID_Empresa"]
          },
        ]
      }
      fLocacoes: {
        Row: {
          Atualizado_Em: string | null
          Atualizado_Por: string | null
          Cobranca: string | null
          Criado_Em: string
          Criado_Por: string | null
          Data_Devolucao: string | null
          Data_Devolucao_Prevista: string
          Data_Retirada: string
          Equipamento: string
          ID_Empresa: string
          ID_Locacao: string
          ID_Obra: string | null
          ID_Saida: string | null
          Locadora: string | null
          Observacao: string | null
          Quantidade: number
          Telefone_Locadora: string | null
          Valor: number | null
        }
        Insert: {
          Atualizado_Em?: string | null
          Atualizado_Por?: string | null
          Cobranca?: string | null
          Criado_Em?: string
          Criado_Por?: string | null
          Data_Devolucao?: string | null
          Data_Devolucao_Prevista: string
          Data_Retirada: string
          Equipamento: string
          ID_Empresa: string
          ID_Locacao: string
          ID_Obra?: string | null
          ID_Saida?: string | null
          Locadora?: string | null
          Observacao?: string | null
          Quantidade?: number
          Telefone_Locadora?: string | null
          Valor?: number | null
        }
        Update: {
          Atualizado_Em?: string | null
          Atualizado_Por?: string | null
          Cobranca?: string | null
          Criado_Em?: string
          Criado_Por?: string | null
          Data_Devolucao?: string | null
          Data_Devolucao_Prevista?: string
          Data_Retirada?: string
          Equipamento?: string
          ID_Empresa?: string
          ID_Locacao?: string
          ID_Obra?: string | null
          ID_Saida?: string | null
          Locadora?: string | null
          Observacao?: string | null
          Quantidade?: number
          Telefone_Locadora?: string | null
          Valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fLocacoes_Atualizado_Por_fkey"
            columns: ["Atualizado_Por"]
            isOneToOne: false
            referencedRelation: "dUsuarios"
            referencedColumns: ["ID_Usuario"]
          },
          {
            foreignKeyName: "fLocacoes_Criado_Por_fkey"
            columns: ["Criado_Por"]
            isOneToOne: false
            referencedRelation: "dUsuarios"
            referencedColumns: ["ID_Usuario"]
          },
          {
            foreignKeyName: "fLocacoes_ID_Empresa_fkey"
            columns: ["ID_Empresa"]
            isOneToOne: false
            referencedRelation: "dEmpresas"
            referencedColumns: ["ID_Empresa"]
          },
          {
            foreignKeyName: "fLocacoes_ID_Obra_fkey"
            columns: ["ID_Empresa", "ID_Obra"]
            isOneToOne: false
            referencedRelation: "dObras"
            referencedColumns: ["ID_Empresa", "ID_Obra"]
          },
          {
            foreignKeyName: "fLocacoes_ID_Obra_fkey"
            columns: ["ID_Empresa", "ID_Obra"]
            isOneToOne: false
            referencedRelation: "vw_resumo_obras"
            referencedColumns: ["ID_Empresa", "ID_Obra"]
          },
          {
            foreignKeyName: "fLocacoes_ID_Saida_fkey"
            columns: ["ID_Empresa", "ID_Saida"]
            isOneToOne: false
            referencedRelation: "fSaidasObras"
            referencedColumns: ["ID_Empresa", "ID_Saida"]
          },
        ]
      }
      fPagamentosMaoDeObra: {
        Row: {
          Atualizado_Em: string | null
          Atualizado_Por: string | null
          Criado_Em: string
          Criado_Por: string | null
          Data_Pagamento: string | null
          Dias_Trabalhados: string[] | null
          Forma_Pagamento: string | null
          ID_Empresa: string
          ID_Obra: string
          ID_Pagamento: string
          ID_Trabalhador: string
          Observacao: string | null
          Periodo_Fim: string | null
          Periodo_Inicio: string | null
          Quantidade_Dias: number | null
          Tipo_Pagamento: string | null
          Valor_Diaria_Aplicado: number | null
          Valor_Pago: number | null
        }
        Insert: {
          Atualizado_Em?: string | null
          Atualizado_Por?: string | null
          Criado_Em?: string
          Criado_Por?: string | null
          Data_Pagamento?: string | null
          Dias_Trabalhados?: string[] | null
          Forma_Pagamento?: string | null
          ID_Empresa: string
          ID_Obra: string
          ID_Pagamento: string
          ID_Trabalhador: string
          Observacao?: string | null
          Periodo_Fim?: string | null
          Periodo_Inicio?: string | null
          Quantidade_Dias?: number | null
          Tipo_Pagamento?: string | null
          Valor_Diaria_Aplicado?: number | null
          Valor_Pago?: number | null
        }
        Update: {
          Atualizado_Em?: string | null
          Atualizado_Por?: string | null
          Criado_Em?: string
          Criado_Por?: string | null
          Data_Pagamento?: string | null
          Dias_Trabalhados?: string[] | null
          Forma_Pagamento?: string | null
          ID_Empresa?: string
          ID_Obra?: string
          ID_Pagamento?: string
          ID_Trabalhador?: string
          Observacao?: string | null
          Periodo_Fim?: string | null
          Periodo_Inicio?: string | null
          Quantidade_Dias?: number | null
          Tipo_Pagamento?: string | null
          Valor_Diaria_Aplicado?: number | null
          Valor_Pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fPagamentosMaoDeObra_Atualizado_Por_fkey"
            columns: ["Atualizado_Por"]
            isOneToOne: false
            referencedRelation: "dUsuarios"
            referencedColumns: ["ID_Usuario"]
          },
          {
            foreignKeyName: "fPagamentosMaoDeObra_Criado_Por_fkey"
            columns: ["Criado_Por"]
            isOneToOne: false
            referencedRelation: "dUsuarios"
            referencedColumns: ["ID_Usuario"]
          },
          {
            foreignKeyName: "fPagamentosMaoDeObra_ID_Empresa_fkey"
            columns: ["ID_Empresa"]
            isOneToOne: false
            referencedRelation: "dEmpresas"
            referencedColumns: ["ID_Empresa"]
          },
          {
            foreignKeyName: "fPagamentosMaoDeObra_ID_Obra_fkey"
            columns: ["ID_Empresa", "ID_Obra"]
            isOneToOne: false
            referencedRelation: "dObras"
            referencedColumns: ["ID_Empresa", "ID_Obra"]
          },
          {
            foreignKeyName: "fPagamentosMaoDeObra_ID_Obra_fkey"
            columns: ["ID_Empresa", "ID_Obra"]
            isOneToOne: false
            referencedRelation: "vw_resumo_obras"
            referencedColumns: ["ID_Empresa", "ID_Obra"]
          },
          {
            foreignKeyName: "fPagamentosMaoDeObra_ID_Trabalhador_fkey"
            columns: ["ID_Empresa", "ID_Trabalhador"]
            isOneToOne: false
            referencedRelation: "dTrabalhadores"
            referencedColumns: ["ID_Empresa", "ID_Trabalhador"]
          },
        ]
      }
      fRecebimentosObras: {
        Row: {
          Atualizado_Em: string | null
          Atualizado_Por: string | null
          Criado_Em: string
          Criado_Por: string | null
          Data_Recebimento: string | null
          Forma_Pagamento: string | null
          ID_Empresa: string
          ID_Obra: string
          ID_Recebimento: string
          Observacao: string | null
          Valor_Recebido: number | null
        }
        Insert: {
          Atualizado_Em?: string | null
          Atualizado_Por?: string | null
          Criado_Em?: string
          Criado_Por?: string | null
          Data_Recebimento?: string | null
          Forma_Pagamento?: string | null
          ID_Empresa: string
          ID_Obra: string
          ID_Recebimento: string
          Observacao?: string | null
          Valor_Recebido?: number | null
        }
        Update: {
          Atualizado_Em?: string | null
          Atualizado_Por?: string | null
          Criado_Em?: string
          Criado_Por?: string | null
          Data_Recebimento?: string | null
          Forma_Pagamento?: string | null
          ID_Empresa?: string
          ID_Obra?: string
          ID_Recebimento?: string
          Observacao?: string | null
          Valor_Recebido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fRecebimentosObras_Atualizado_Por_fkey"
            columns: ["Atualizado_Por"]
            isOneToOne: false
            referencedRelation: "dUsuarios"
            referencedColumns: ["ID_Usuario"]
          },
          {
            foreignKeyName: "fRecebimentosObras_Criado_Por_fkey"
            columns: ["Criado_Por"]
            isOneToOne: false
            referencedRelation: "dUsuarios"
            referencedColumns: ["ID_Usuario"]
          },
          {
            foreignKeyName: "fRecebimentosObras_ID_Empresa_fkey"
            columns: ["ID_Empresa"]
            isOneToOne: false
            referencedRelation: "dEmpresas"
            referencedColumns: ["ID_Empresa"]
          },
          {
            foreignKeyName: "fRecebimentosObras_ID_Obra_fkey"
            columns: ["ID_Empresa", "ID_Obra"]
            isOneToOne: false
            referencedRelation: "dObras"
            referencedColumns: ["ID_Empresa", "ID_Obra"]
          },
          {
            foreignKeyName: "fRecebimentosObras_ID_Obra_fkey"
            columns: ["ID_Empresa", "ID_Obra"]
            isOneToOne: false
            referencedRelation: "vw_resumo_obras"
            referencedColumns: ["ID_Empresa", "ID_Obra"]
          },
        ]
      }
      fSaidasObras: {
        Row: {
          Atualizado_Em: string | null
          Atualizado_Por: string | null
          Comprovante_URL: string | null
          Criado_Em: string
          Criado_Por: string | null
          Data_Saida: string | null
          Descricao: string | null
          Forma_Pagamento: string | null
          Fornecedor_Local: string | null
          ID_Categoria: string
          ID_Empresa: string
          ID_Obra: string | null
          ID_Saida: string
          Numero_Nota_Fiscal: string | null
          Valor: number | null
        }
        Insert: {
          Atualizado_Em?: string | null
          Atualizado_Por?: string | null
          Comprovante_URL?: string | null
          Criado_Em?: string
          Criado_Por?: string | null
          Data_Saida?: string | null
          Descricao?: string | null
          Forma_Pagamento?: string | null
          Fornecedor_Local?: string | null
          ID_Categoria: string
          ID_Empresa: string
          ID_Obra?: string | null
          ID_Saida: string
          Numero_Nota_Fiscal?: string | null
          Valor?: number | null
        }
        Update: {
          Atualizado_Em?: string | null
          Atualizado_Por?: string | null
          Comprovante_URL?: string | null
          Criado_Em?: string
          Criado_Por?: string | null
          Data_Saida?: string | null
          Descricao?: string | null
          Forma_Pagamento?: string | null
          Fornecedor_Local?: string | null
          ID_Categoria?: string
          ID_Empresa?: string
          ID_Obra?: string | null
          ID_Saida?: string
          Numero_Nota_Fiscal?: string | null
          Valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fSaidasObras_Atualizado_Por_fkey"
            columns: ["Atualizado_Por"]
            isOneToOne: false
            referencedRelation: "dUsuarios"
            referencedColumns: ["ID_Usuario"]
          },
          {
            foreignKeyName: "fSaidasObras_Criado_Por_fkey"
            columns: ["Criado_Por"]
            isOneToOne: false
            referencedRelation: "dUsuarios"
            referencedColumns: ["ID_Usuario"]
          },
          {
            foreignKeyName: "fSaidasObras_ID_Categoria_fkey"
            columns: ["ID_Empresa", "ID_Categoria"]
            isOneToOne: false
            referencedRelation: "dCategoriaGastos"
            referencedColumns: ["ID_Empresa", "ID_Categoria"]
          },
          {
            foreignKeyName: "fSaidasObras_ID_Empresa_fkey"
            columns: ["ID_Empresa"]
            isOneToOne: false
            referencedRelation: "dEmpresas"
            referencedColumns: ["ID_Empresa"]
          },
          {
            foreignKeyName: "fSaidasObras_ID_Obra_fkey"
            columns: ["ID_Empresa", "ID_Obra"]
            isOneToOne: false
            referencedRelation: "dObras"
            referencedColumns: ["ID_Empresa", "ID_Obra"]
          },
          {
            foreignKeyName: "fSaidasObras_ID_Obra_fkey"
            columns: ["ID_Empresa", "ID_Obra"]
            isOneToOne: false
            referencedRelation: "vw_resumo_obras"
            referencedColumns: ["ID_Empresa", "ID_Obra"]
          },
        ]
      }
    }
    Views: {
      vw_fluxo_mensal: {
        Row: {
          entradas: number | null
          ID_Empresa: string | null
          ID_Obra: string | null
          mes: string | null
          saidas: number | null
          saldo: number | null
        }
        Relationships: []
      }
      vw_resumo_obras: {
        Row: {
          a_receber: number | null
          custo_total: number | null
          Data_Inicio: string | null
          ID_Empresa: string | null
          ID_Obra: string | null
          margem_prevista: number | null
          Nome_Cliente: string | null
          Nome_Obra: string | null
          Previsao_Termino: string | null
          saldo_caixa: number | null
          Status: string | null
          total_mao_de_obra: number | null
          total_recebido: number | null
          total_saidas: number | null
          valor_contratado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dObras_ID_Empresa_fkey"
            columns: ["ID_Empresa"]
            isOneToOne: false
            referencedRelation: "dEmpresas"
            referencedColumns: ["ID_Empresa"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
