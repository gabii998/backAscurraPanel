// Shared between CreateIgExamplePost and RetryIgExampleSummary so the two call sites can't
// drift out of sync (they used to each hardcode their own copy of this string).
//
// Colors/layout/typography are asked for CONCRETELY (approx hex, a named layout pattern) —
// unlike everything else here, those are design mechanics, not "content" of the referenced
// post, so describing them concretely doesn't risk the model reproducing someone else's real
// post. GenerateIgPosts.ts depends on this concreteness when writing each post's imagePrompt,
// so it can actually resemble the brand's uploaded references instead of only getting an
// abstract mood description it can't act on.
export const STYLE_REFERENCE_ANALYSIS_SYSTEM_PROMPT = `Analizá esta referencia de Instagram y devolvé SOLO JSON válido con summary. Incluí:
- Paleta aproximada: 2-4 colores dominantes en hex aproximado (ej. "Paleta aproximada: #1a2b3c, #f4f1ec, #d99a3d").
- Patrón de layout, elegido de esta lista: "texto centrado sin imagen", "cita/frase tipográfica", "imagen destacada + texto", "imagen de fondo completo con texto superpuesto", "collage de múltiples imágenes con texto".
- Tratamiento tipográfico (peso, mayúsculas/minúsculas, serif/sans, tamaño relativo del titular).
- Densidad de espaciado (compacto vs. airy) y jerarquía general.
- Tono/voz, longitud, emojis, puntuación.
Está PROHIBIDO transcribir o mencionar: texto visible, temas, marcas, productos, ofertas, hashtags, frases, CTAs, o contenido de capturas de pantalla/UI. Referite a elementos concretos de contenido solo de forma abstracta (ej. "bloque de imagen"), nunca qué muestran. Los colores/layout/tipografía SÍ deben ser concretos — eso no es "contenido", es diseño.`;

export const STYLE_REFERENCE_ANALYSIS_USER_PROMPT = "Generá una ficha abstracta de estilo, sin conservar contenido de la publicación.";
