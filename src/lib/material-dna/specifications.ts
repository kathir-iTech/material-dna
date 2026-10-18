interface Facet {
  key: string;
  label: string;
  values: string[];
}
/** Additional explicit specifications, separate from the submitted parser/benchmark. */
export function engineeringFacets(description: string): Facet[] {
  const text = description.toLowerCase();
  const capture = (
    regex: RegExp,
    map: (m: RegExpMatchArray) => string = (m) => m[1],
  ) => [...new Set([...text.matchAll(regex)].map(map))].sort();
  return [
    {
      key: "pressure",
      label: "Operating pressure",
      values: capture(
        /(\d+(?:\.\d+)?)\s*(bar|psi|mpa)\b/g,
        (m) =>
          (
            Number(m[1]) * ({ bar: 1, psi: 0.0689476, mpa: 10 }[m[2]] ?? 1)
          ).toFixed(3) + " bar",
      ),
    },
    {
      key: "angle",
      label: "Angle",
      values: capture(
        /(\d+(?:\.\d+)?)\s*(?:°|deg(?:rees?)?\b)/g,
        (m) => Number(m[1]) + " degrees",
      ),
    },
    {
      key: "mesh",
      label: "Mesh rating",
      values: capture(/(?:mesh\s*(\d+)|(\d+)\s*mesh\b)/g, (m) => m[1] || m[2]),
    },
    {
      key: "hardness",
      label: "Hardness",
      values: capture(/(?:hrc\s*(\d+)|(\d+)\s*hrc\b)/g, (m) => m[1] || m[2]),
    },
    {
      key: "actuation",
      label: "Actuation",
      values: capture(
        /\b(manual|pneumatic|hydraulic|electric(?:al)?(?:ly)?)\b/g,
        (m) => (m[1].startsWith("electric") ? "electric" : m[1]),
      ),
    },
    {
      key: "manufacture",
      label: "Manufacturing process",
      values: capture(/\b(seamless|smls|erw|welded)\b/g, (m) =>
        m[1] === "smls" ? "seamless" : m[1] === "erw" ? "welded" : m[1],
      ),
    },
    {
      key: "pressureClass",
      label: "Numeric pressure class",
      values:
        /\b(valve|pipe|flange|fitting|elbow|reducer|strainer|vessel|hose)\b/.test(
          text,
        )
          ? capture(/\bclass\s*(\d+(?:\.\d+)?)\b/g, (m) => String(Number(m[1])))
          : [],
    },
    {
      key: "connection",
      label: "End connection",
      values: capture(
        /\b(wafer|lug|flanged|threaded|socket[ -]?weld|butt[ -]?weld)\b/g,
        (m) => m[1].replace(/[ -]/g, ""),
      ),
    },
    {
      key: "bore",
      label: "Flow passage",
      values: capture(/\b(full|reduced|standard)\s+(?:bore|port)\b/g),
    },
    {
      key: "actuatorGeometry",
      label: "Actuator geometry",
      values: capture(/\b(roller\s+lever|plunger)\b/g, (m) =>
        m[1].replace(/\s+/g, " "),
      ),
    },
    {
      key: "compound",
      label: "Material condition",
      values: capture(/\b(virgin|filled)\b/g),
    },
    {
      key: "shore",
      label: "Shore hardness",
      values: capture(
        /(?:(\d+(?:\.\d+)?)\s*shore\s*([ad])|shore\s*([ad])\s*(\d+(?:\.\d+)?))\b/g,
        (m) => `${Number(m[1] || m[4])} Shore ${(m[2] || m[3]).toUpperCase()}`,
      ),
    },
    {
      key: "polymer",
      label: "Polymer composition",
      values: capture(
        /\b(ptfe|nylon|nitrile|viton|neoprene|silicone|epdm|pvc|upvc)\b/g,
      ),
    },
  ];
}
