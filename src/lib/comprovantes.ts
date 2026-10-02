import { supabase } from '@/lib/supabase'

/*
 * Comprovantes das saídas no bucket privado `comprovantes`.
 * Caminho: {ID_Empresa}/{ID_Obra ou 'empresa'}/{uuid}.{ext} — a RLS do Storage libera só a pasta da empresa.
 * Em fSaidasObras.Comprovante_URL guardamos o CAMINHO (não uma URL pública).
 */

const BUCKET = 'comprovantes'
const LADO_MAXIMO = 1600
const TAMANHO_MAXIMO = 10 * 1024 * 1024

export const TIPOS_ACEITOS = 'image/*,application/pdf'

/** Estado do campo de comprovante num formulário. */
export type EstadoComprovante = {
  /** Caminho já salvo no banco (edição). */
  atual: string | null
  /** Arquivo escolhido agora, ainda não enviado. */
  novo: File | null
  /** Usuário pediu para tirar o comprovante atual. */
  remover: boolean
}

export const comprovanteInicial = (atual: string | null): EstadoComprovante => ({
  atual,
  novo: null,
  remover: false,
})

/** Reduz fotos grandes do celular (ex.: 4000px, 5 MB → 1600px, ~300 KB). PDF passa direto. */
async function comprimir(arquivo: File): Promise<Blob> {
  if (!arquivo.type.startsWith('image/') || arquivo.type === 'image/gif') return arquivo
  try {
    const bitmap = await createImageBitmap(arquivo)
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * escala)
    canvas.height = Math.round(bitmap.height * escala)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', 0.8))
    return blob && blob.size < arquivo.size ? blob : arquivo
  } catch {
    // navegador não decodifica o formato (ex.: HEIC fora do Safari): envia o original
    return arquivo
  }
}

export function validarArquivo(arquivo: File): string | null {
  if (!arquivo.type.startsWith('image/') && arquivo.type !== 'application/pdf') {
    return 'Envie uma foto ou um PDF.'
  }
  if (arquivo.size > TAMANHO_MAXIMO * 3) return 'Arquivo muito grande (máx. 10 MB).'
  return null
}

export async function enviarComprovante(arquivo: File, idEmpresa: string, idObra: string): Promise<string> {
  const conteudo = await comprimir(arquivo)
  if (conteudo.size > TAMANHO_MAXIMO) throw { code: 'FUNCAO', message: 'Arquivo muito grande (máx. 10 MB).' }
  const ext = conteudo.type === 'application/pdf' ? 'pdf' : conteudo.type === 'image/jpeg' ? 'jpg' : (conteudo.type.split('/')[1] ?? 'bin')
  const caminho = `${idEmpresa}/${idObra}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, conteudo, {
    contentType: conteudo.type,
    upsert: false,
  })
  if (error) throw error
  return caminho
}

/** Link temporário (10 min) para abrir o arquivo privado. */
export async function linkComprovante(caminho: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, 600)
  if (error) throw error
  return data.signedUrl
}

/** Melhor esforço: se falhar (ex.: sem permissão), o arquivo só fica órfão no bucket. */
export async function apagarComprovante(caminho: string | null | undefined) {
  if (!caminho) return
  await supabase.storage.from(BUCKET).remove([caminho]).catch(() => undefined)
}

export function ehPdf(caminho: string) {
  return caminho.toLowerCase().endsWith('.pdf')
}
