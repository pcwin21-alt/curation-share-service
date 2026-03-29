import ogs from 'open-graph-scraper'

export interface MetaResult {
  title: string
  description: string
  thumbnailUrl?: string
  success: boolean
}

export async function fetchMeta(url: string): Promise<MetaResult> {
  try {
    const { result, error } = await ogs({ url, timeout: 5000 })
    if (error || !result.success) {
      return { title: '', description: '', success: false }
    }

    const thumbnail =
      result.ogImage && result.ogImage.length > 0
        ? result.ogImage[0].url
        : undefined

    return {
      title: result.ogTitle ?? result.dcTitle ?? '',
      description: result.ogDescription ?? '',
      thumbnailUrl: thumbnail,
      success: true,
    }
  } catch {
    return { title: '', description: '', success: false }
  }
}
