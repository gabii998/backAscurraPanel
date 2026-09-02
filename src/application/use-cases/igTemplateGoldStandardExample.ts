// One hand-authored, brand-agnostic reference template, shown to the model purely to
// calibrate polish (margins, type scale, hierarchy, contrast) — never colors/copy to copy.
// Text-only self-review checklists let a model "grade itself" without ever rendering the
// HTML it wrote; a concrete worked example is a much stronger anchor for what "good" looks
// like than another paragraph of prose instructions.
export const TEMPLATE_GOLD_STANDARD_EXAMPLE = `Ejemplo de referencia (calidad esperada — marca FICTICIA, genérica; NO copies sus colores, tipografía ni texto: fijate solo en el nivel de pulido — márgenes, escala tipográfica, jerarquía, contraste):

\`\`\`html
<div style="width:1080px;height:1080px;position:relative;background:#132a3a;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;overflow:hidden;">
  <div style="position:absolute;inset:0;background:linear-gradient(180deg, rgba(19,42,58,0) 40%, rgba(19,42,58,0.92) 100%);"></div>
  <div style="position:absolute;left:64px;right:64px;bottom:96px;">
    <div style="font-size:72px;font-weight:800;line-height:1.15;color:#ffffff;max-width:85%;">{{headline}}</div>
    <div style="margin-top:24px;font-size:32px;line-height:1.4;color:#e4ecf1;max-width:85%;">{{subtext}}</div>
    <div style="margin-top:32px;display:inline-block;padding:16px 32px;background:#ffb020;border-radius:48px;font-size:28px;font-weight:700;color:#132a3a;">{{cta}}</div>
  </div>
  <img src="{{brandLogoUrl}}" style="position:absolute;left:64px;top:64px;width:88px;height:88px;object-fit:contain;" />
</div>
\`\`\`

Por qué funciona: un solo foco visual (el bloque de texto abajo), márgenes de 64px respetados en los cuatro lados, escala de espaciado en múltiplos de 8 (16/24/32/64/96), texto blanco solo sobre la franja oscurecida por el degradado (nunca sobre el fondo claro sin protección), tamaños de fuente dentro de los rangos legibles, y el logo como \`<img>\` suelto sin tarjeta ni fondo agregado detrás.`;
