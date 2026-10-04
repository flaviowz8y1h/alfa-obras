// Telas internas carregam sob demanda: o primeiro acesso (login + painel) fica mais leve.
// precarregarPaginas() busca esses arquivos em segundo plano depois que o painel abre,
// para a troca de tela não esperar o download.
export const paginas = {
  obras: () => import('@/features/obras/ObrasPage'),
  obraDetalhe: () => import('@/features/obras/ObraDetalhePage'),
  clientes: () => import('@/features/clientes/ClientesPage'),
  trabalhadores: () => import('@/features/trabalhadores/TrabalhadoresPage'),
  categorias: () => import('@/features/categorias/CategoriasPage'),
  saidas: () => import('@/features/lancamentos/SaidasPage'),
  recebimentos: () => import('@/features/lancamentos/RecebimentosPage'),
  maoDeObra: () => import('@/features/lancamentos/MaoDeObraPage'),
  analises: () => import('@/features/analises/AnalisesPage'),
  usuarios: () => import('@/features/usuarios/UsuariosPage'),
  locacoes: () => import('@/features/locacoes/LocacoesPage'),
}

export function precarregarPaginas() {
  for (const carregar of Object.values(paginas)) void carregar().catch(() => {})
}
