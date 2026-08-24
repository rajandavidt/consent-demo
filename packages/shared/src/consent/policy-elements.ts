// packages/shared/src/consent/policy-elements.ts — the data-element LABELS, read from the published
// policy rather than restated here.
//
// WHY THIS EXISTS SEPARATELY FROM THE MANAGER. The authenticated plane's `GET /purposes` returns
// purposes and a policy version, and no `elements` array — a purpose carries its `elementKey`, but
// nothing carries "phone" -> "Phone number". ConsentPreferences takes those labels as a host-supplied
// prop for exactly that reason (AK-8511), so the host has to get them from somewhere.
//
// WHY THE PUBLIC ENDPOINT IS THE RIGHT SOURCE. `GET /v1/c/:siteKey/config` is the PUBLISHED POLICY
// DOCUMENT: it is public by design, needs no token, and says nothing whatsoever about any subject.
// Reading it for labels leaks nothing — only the DECISIONS need the authenticated plane, and those
// still go there. The alternative was hardcoding the labels in this repo, which would make the demo
// state policy content it does not own; the moment an operator renamed a field in the console, the
// app would keep showing the old name.
import { useEffect, useState } from 'react';
import { AKKU_CONFIG, AKKU_CONFIGURED } from './config.js';

export interface PolicyElement {
  label: string;
  description?: string;
}

interface ConfigElement {
  key: string;
  label: string;
  description?: string;
  displayOrder?: number;
}

/**
 * Element labels from the published policy, in `displayOrder`.
 *
 * `{}` until the read completes, and `{}` if it fails. A missing label costs a line of context on a
 * settings page; it must never stop a consent surface rendering (Rule #1), so there is no error state
 * here to propagate — ConsentPreferences treats the whole prop as optional and simply says less.
 */
export function usePolicyElements(): Record<string, PolicyElement> {
  const [elements, setElements] = useState<Record<string, PolicyElement>>({});

  useEffect(() => {
    if (!AKKU_CONFIGURED) return;
    let cancelled = false;
    const url = `${AKKU_CONFIG.apiHost}/v1/c/${AKKU_CONFIG.siteKey}/config`;
    void fetch(url)
      .then((response) => (response.ok ? response.json() : null))
      .then((config: { elements?: ConfigElement[] } | null) => {
        if (cancelled || config === null) return;
        const ordered = [...(config.elements ?? [])].sort(
          (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
        );
        const next: Record<string, PolicyElement> = {};
        for (const element of ordered) {
          next[element.key] =
            element.description === undefined
              ? { label: element.label }
              : { label: element.label, description: element.description };
        }
        setElements(next);
      })
      .catch(() => {
        // Deliberately silent. See the note above: a label is context, not consent.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return elements;
}
