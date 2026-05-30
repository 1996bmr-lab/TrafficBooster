// Builds JSON-LD structured data for common types so pages become
// eligible for rich results in search (better CTR & visibility).

function build(type, data) {
  const schema = { "@context": "https://schema.org", "@type": type, ...data };
  // Strip empty values.
  for (const k of Object.keys(schema)) {
    const v = schema[k];
    if (v === "" || v == null || (Array.isArray(v) && v.length === 0)) delete schema[k];
  }
  return schema;
}

export function generateSchema(kind, input = {}) {
  let schema;
  switch ((kind || "").toLowerCase()) {
    case "organization":
      schema = build("Organization", {
        name: input.name,
        url: input.url,
        logo: input.logo,
        description: input.description,
        sameAs: splitList(input.sameAs),
      });
      break;

    case "localbusiness":
      schema = build("LocalBusiness", {
        name: input.name,
        url: input.url,
        telephone: input.telephone,
        priceRange: input.priceRange,
        address: input.streetAddress
          ? {
              "@type": "PostalAddress",
              streetAddress: input.streetAddress,
              addressLocality: input.city,
              addressRegion: input.region,
              postalCode: input.postalCode,
              addressCountry: input.country,
            }
          : undefined,
      });
      break;

    case "article":
      schema = build("Article", {
        headline: input.headline || input.title,
        description: input.description,
        image: input.image,
        datePublished: input.datePublished,
        dateModified: input.dateModified || input.datePublished,
        author: input.author
          ? { "@type": "Person", name: input.author }
          : undefined,
        publisher: input.publisher
          ? { "@type": "Organization", name: input.publisher }
          : undefined,
      });
      break;

    case "product":
      schema = build("Product", {
        name: input.name,
        description: input.description,
        image: input.image,
        brand: input.brand ? { "@type": "Brand", name: input.brand } : undefined,
        offers: input.price
          ? {
              "@type": "Offer",
              price: String(input.price),
              priceCurrency: input.currency || "USD",
              availability: `https://schema.org/${input.availability || "InStock"}`,
            }
          : undefined,
      });
      break;

    case "faq":
      schema = build("FAQPage", {
        mainEntity: (input.faqs || [])
          .filter((f) => f.question && f.answer)
          .map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
      });
      break;

    case "breadcrumb":
      schema = build("BreadcrumbList", {
        itemListElement: (input.items || [])
          .filter((i) => i.name)
          .map((i, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            name: i.name,
            item: i.url,
          })),
      });
      break;

    case "website":
      schema = build("WebSite", {
        name: input.name,
        url: input.url,
        potentialAction: input.searchUrl
          ? {
              "@type": "SearchAction",
              target: `${input.searchUrl}{search_term_string}`,
              "query-input": "required name=search_term_string",
            }
          : undefined,
      });
      break;

    default:
      throw new Error(`Unsupported schema type: "${kind}".`);
  }

  const json = JSON.stringify(schema, null, 2);
  return {
    type: kind,
    json,
    scriptTag: `<script type="application/ld+json">\n${json}\n</script>`,
  };
}

function splitList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return String(v)
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
