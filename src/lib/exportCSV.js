import { Capacitor } from '@capacitor/core'

/**
 * Faz download ou compartilhamento de um arquivo CSV.
 *
 * - Web/Desktop : usa Blob + <a download> (comportamento original)
 * - Android     : salva no cache do app e abre o compartilhamento nativo
 *                 (usuário pode salvar em Arquivos, enviar por e-mail, etc.)
 */
export async function exportCSV(filename, csvContent) {
  if (Capacitor.isNativePlatform()) {
    await exportAndroid(filename, csvContent)
  } else {
    exportWeb(filename, csvContent)
  }
}

// ─── Web ─────────────────────────────────────────────────────────────────────

function exportWeb(filename, csvContent) {
  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href  = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

// ─── Android ─────────────────────────────────────────────────────────────────

async function exportAndroid(filename, csvContent) {
  const { Filesystem } = await import('@capacitor/filesystem')
  const { Share }      = await import('@capacitor/share')
  const { Encoding, Directory } = await import('@capacitor/filesystem')

  // Salva no diretório de cache do app (sem permissão necessária)
  await Filesystem.writeFile({
    path:      filename,
    data:      csvContent,
    directory: Directory.Cache,
    encoding:  Encoding.UTF8,
  })

  const { uri } = await Filesystem.getUri({
    path:      filename,
    directory: Directory.Cache,
  })

  await Share.share({
    title:       filename,
    files:       [uri],
    dialogTitle: 'Exportar CSV',
  })
}
