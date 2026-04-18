import sanitizeHtml from "sanitize-html";
import { optimize } from "svgo";

export const NEWS_SANITIZE_OPTIONS = {
  allowedTags: ["p", "h2", "h3", "strong", "em", "ul", "ol", "li", "a", "blockquote", "img"],
  allowedAttributes: {
    a: ["href", "rel", "target"],
    img: ["src", "alt", "width", "height"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  transformTags: {
    a: (tag, attribs) => ({
      tagName: "a",
      attribs: {
        href: attribs.href || "",
        rel: "noopener noreferrer",
        target: attribs.target === "_blank" ? "_blank" : "_self",
      },
    }),
  },
  disallowedTagsMode: "discard",
};

export function sanitizeNewsHtml(dirty) {
  return sanitizeHtml(dirty || "", NEWS_SANITIZE_OPTIONS);
}

export const SVGO_CONFIG = {
  multipass: true,
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          removeViewBox: false,
        },
      },
    },
    "removeScripts",
    {
      name: "removeAttrs",
      params: {
        attrs: ["(on.*)", "xlink:.*"],
      },
    },
  ],
};

export function sanitizeSvg(svgString) {
  // Pre-pass: strip @import in <style> and <foreignObject> blocks entirely; svgo's plugins
  // don't reliably drop either. Done as raw regex before parsing.
  const prepass = svgString
    .replace(/@import[^;]+;?/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
  const result = optimize(prepass, SVGO_CONFIG);
  if (!("data" in result)) throw new Error("SVG sanitization failed");
  // Post-pass: make doubly sure xlink:href and event handlers are gone.
  return result.data
    .replace(/\s(xlink:[a-z-]+)="[^"]*"/gi, "")
    .replace(/\s(on[a-z]+)="[^"]*"/gi, "");
}
