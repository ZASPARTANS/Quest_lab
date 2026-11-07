// The colour key of the map (plan PLAN-012, user feedback: orange looked like heat). Pure functions: the words come from config/frontend.json `map.key`
// and the colours and the rain threshold from the manifest, so the key can never disagree with the pictures. The page draws them with textContent (mapcontrols.js).

/** Lines of the key for the "both models" view: [{ colour (#rrggbb or null = no colour), text }], then the footnote text ('' if the threshold is unknown). */
export function agreementKey(key, manifest) {
  const colours = manifest.frames?.agreement_colours ?? {};
  const mm = manifest.agreement?.wet_threshold_mm;
  return {
    lines: [
      { colour: colours.both_wet ?? null, text: key.agreement.both_wet },
      { colour: colours.disagree ?? null, text: key.agreement.disagree },
      { colour: null, text: key.agreement.none },
    ],
    footnote: Number.isFinite(mm) ? key.agreement.footnote.replace('{mm}', String(mm)) : '',
  };
}

/** The sentence under the numbers bar of a single-model view. */
export const modelSentence = (key) => key.model;
