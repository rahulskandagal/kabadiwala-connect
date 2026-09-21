// On-device image classification: TensorFlow.js MobileNet (runs in the phone browser, cached by the
// service worker after first load). ImageNet labels are mapped to e-waste categories via the hint
// lists in data/categories.json; the collector always confirms or corrects the suggestion.
window.AI = (() => {
  let model = null, loading = null, cats = []
  const norm = (s) => s.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()

  async function load(categories) {
    cats = categories
    if (model) return model
    if (loading) return loading
    loading = (async () => {
      if (!window.tf || !window.mobilenet) throw new Error('tfjs not loaded')
      await tf.ready()
      model = await mobilenet.load({ version: 2, alpha: 0.5 })   // small: ~5 MB, fine on entry-level phones
      return model
    })()
    return loading
  }

  // returns [{id, score, label}] sorted by score (top 3 categories)
  async function classify(imgEl) {
    const m = await load(cats)
    const preds = await m.classify(imgEl, 8)
    const scores = {}
    for (const p of preds) {
      const labels = p.className.split(',').map(norm)
      for (const c of cats) {
        const hit = c.hints.some((h) => labels.some((l) => l.includes(norm(h)) || norm(h).includes(l)))
        if (hit) scores[c.id] = (scores[c.id] || 0) + p.probability
      }
    }
    const out = Object.entries(scores).map(([id, score]) => ({ id, score, label: preds[0].className.split(',')[0] }))
      .sort((a, b) => b.score - a.score).slice(0, 3)
    return { suggestions: out, raw: preds.slice(0, 3) }
  }
  return { load, classify, get ready() { return !!model } }
})()
