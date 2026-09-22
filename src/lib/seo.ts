const SITE = "VZG CONSULT";

type PageHeadArgs = {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
};

/** Builds route head() metadata: title, description, OpenGraph, canonical. */
export function pageHead({ title, description, path, type = "website" }: PageHeadArgs) {
  const fullTitle = title.includes(SITE) ? title : `${title} — ${SITE}`;
  return {
    meta: [
      { title: fullTitle },
      { name: "description", content: description },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: description },
      { property: "og:type", content: type },
      { property: "og:url", content: path },
      { property: "og:locale", content: "de_DE" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: fullTitle },
      { name: "twitter:description", content: description },
    ],
    links: [{ rel: "canonical", href: path }],
  };
}
